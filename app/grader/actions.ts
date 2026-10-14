"use server";

import { revalidatePath } from "next/cache";
import { canonicalCountChecks } from "@/lib/grading-input";
import { toCategoryConfig, toFormProfile } from "@/lib/category-config";
import { writeAudit } from "@/lib/audit";
import { ScoringError, computeGrading } from "@/lib/scoring";
import {
  AuthorizationError,
  createSupabaseServerClient,
  requireRole,
} from "@/lib/supabase/server";
import { ERRORS, GRADER_TEXT, REVISION_TEXT } from "@/lib/text";
import type {
  CategoryCriterionRow,
  SamplePointDb,
  GateCheckRow,
  BatchRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";
import {
  gateCheckSchema,
  gradingSubmitSchema,
  nonB3FindingSchema,
  claimedSpecDetailSchema,
} from "@/lib/validation/schemas";

interface GradingContext extends BatchRow {
  material_categories: MaterialCategoryRow | null;
  material_form_profiles: MaterialFormProfileRow | null;
}
export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

/** Memastikan batch ini memang ditugaskan ke grader yang sedang login. */
async function requireAssignment(batchId: string) {
  const user = await requireRole("grader");
  const supabase = await createSupabaseServerClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("batch_id", batchId)
    .eq("grader_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!assignment)
    throw new AuthorizationError("Batch ini tidak ditugaskan kepadamu.");
  return { user, supabase, assignmentId: assignment.id };
}

/**
 * Menyimpan hasil tiga gerbang wajib.
 *
 * Kalau ada satu saja yang gagal, proses BERHENTI: batch langsung
 * rejected_gate, tidak ada skor, tidak ada grade, tidak ada sertifikat
 * (SRD Bab 7.2).
 */
export async function saveGateCheckAction(
  batchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user, supabase, assignmentId } = await requireAssignment(batchId);

    const { data: gateBatch } = await supabase
      .from("batches")
      .select("status")
      .eq("id", batchId)
      .maybeSingle<{ status: string }>();
    if (!gateBatch || !["assigned", "gate_check"].includes(gateBatch.status))
      return { error: GRADER_TEXT.gateNotAllowed };

    const parsed = gateCheckSchema.safeParse({
      nonB3Pass: formData.get("nonB3Pass") === "on",
      originExistsPass: formData.get("originExistsPass") === "on",
      originAuthenticPass: formData.get("originAuthenticPass") === "on",
      notes: String(formData.get("notes") ?? ""),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
      }
      return { fieldErrors };
    }

    const allPassed =
      parsed.data.nonB3Pass &&
      parsed.data.originExistsPass &&
      parsed.data.originAuthenticPass;

    const { error } = await supabase.from("gate_checks").upsert(
      {
        batch_id: batchId,
        non_b3_pass: parsed.data.nonB3Pass,
        origin_exists_pass: parsed.data.originExistsPass,
        origin_authentic_pass: parsed.data.originAuthenticPass,
        notes: parsed.data.notes || null,
        checked_by: user.id,
        checked_at: new Date().toISOString(),
      },
      { onConflict: "batch_id" },
    );
    if (error) return { error: error.message };

    await supabase
      .from("batches")
      .update({ status: allPassed ? "grading" : "rejected_gate" })
      .eq("id", batchId);

    await supabase
      .from("assignments")
      .update({ status: allPassed ? "in_progress" : "submitted" })
      .eq("id", assignmentId);

    await writeAudit(supabase, {
      actorId: user.id,
      action: allPassed ? "batch.gate_passed" : "batch.gate_rejected",
      entityType: "batch",
      entityId: batchId,
      payload: parsed.data,
    });

    revalidatePath("/grader");
    revalidatePath(`/grader/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Menghitung dan menyimpan hasil grading.
 *
 * Rumusnya TIDAK ditulis ulang di sini — seluruh perhitungan dilakukan
 * `lib/scoring`, lalu hasilnya disimpan apa adanya beserta versi rumusnya,
 * supaya sertifikat lama tidak berubah bila rumus diubah kemudian
 * (SRD Bab 4.3).
 */
/** Hasil akhir dihitung ulang di server dari klaim DB dan profil sampling. */
export async function submitGradingAction(
  input: unknown,
): Promise<ActionState> {
  try {
    const parsed = gradingSubmitSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? ERRORS.generic };
    const { batchId, samplePoints, quantity, documentation, nonB3Reconfirmed } =
      parsed.data;
    const { user, supabase, assignmentId } = await requireAssignment(batchId);
    const [
      { data: batch },
      { data: gate },
      { data: previous, error: previousError },
    ] = await Promise.all([
      supabase
        .from("batches")
        .select("*, material_categories(*), material_form_profiles(*)")
        .eq("id", batchId)
        .maybeSingle<GradingContext>(),
      supabase
        .from("gate_checks")
        .select("*")
        .eq("batch_id", batchId)
        .maybeSingle<GateCheckRow>(),
      supabase
        .from("grading_results")
        .select("id")
        .eq("batch_id", batchId)
        .limit(1)
        .maybeSingle<{ id: string }>(),
    ]);
    if (previousError) return { error: ERRORS.generic };
    if (
      !batch ||
      batch.status !== "grading" ||
      previous ||
      !gate?.non_b3_pass ||
      !gate.origin_exists_pass ||
      !gate.origin_authentic_pass
    )
      return { error: ERRORS.gradingNotAllowed };
    const profile = batch.material_form_profiles;
    if (
      !profile ||
      profile.category_id !== batch.category_id ||
      !profile.is_active ||
      !batch.material_categories?.is_active ||
      batch.material_categories.status !== "live"
    )
      return { error: ERRORS.profileMismatch };
    const claim = claimedSpecDetailSchema.safeParse(batch.claimed_spec_detail);
    if (!claim.success || claim.data.claimMode !== profile.claim_mode)
      return { error: ERRORS.profileMismatch };
    const { data: criteriaRows, error: criteriaError } = await supabase
      .from("category_criteria")
      .select("*")
      .eq("category_id", batch.category_id)
      .order("sort_order")
      .returns<CategoryCriterionRow[]>();
    if (criteriaError) return { error: ERRORS.generic };
    const countChecks = canonicalCountChecks(claim.data, quantity.countChecks);
    const result = computeGrading({
      category: toCategoryConfig(batch.material_categories, criteriaRows ?? []),
      samplingProfile: toFormProfile(profile),
      samplePoints,
      quantity: {
        claimedWeightKg: Number(batch.claimed_weight_kg),
        actualWeightKg: quantity.actualWeightKg,
        countChecks,
        specUnits: {
          passed: quantity.specUnitsPassed,
          checked: quantity.specUnitsChecked,
        },
      },
      documentation,
    });
    const { error: deleteError } = await supabase
      .from("sample_points")
      .delete()
      .eq("batch_id", batchId);
    if (deleteError) return { error: deleteError.message };
    for (const point of samplePoints) {
      const { data: inserted, error } = await supabase
        .from("sample_points")
        .insert({
          batch_id: batchId,
          point: point.point,
          odor_level: point.odorLevel,
          notes: point.notes || null,
        })
        .select("id")
        .single<{ id: string }>();
      if (error || !inserted)
        return { error: error?.message ?? ERRORS.generic };
      const contributions = result.breakdown.samplePoints.find(
        (p) => p.point === point.point,
      )!.contributions;
      const scores = contributions
        .filter((s) => s.rawScore !== null)
        .map((s) => ({
          sample_point_id: inserted.id,
          criterion: s.criterion,
          sub_key: s.subKey,
          raw_score: s.rawScore,
          units_checked: s.unitsChecked,
          units_passed: s.unitsPassed,
          measurement_method: s.measurementMethod,
        }));
      if (scores.length) {
        const { error: scoreError } = await supabase
          .from("sample_scores")
          .insert(scores);
        if (scoreError) return { error: scoreError.message };
      }
    }
    const { error: quantityError } = await supabase
      .from("quantity_checks")
      .upsert(
        {
          batch_id: batchId,
          actual_weight_kg: quantity.actualWeightKg,
          spec_match_pct: result.breakdown.quantity.specMatchPct ?? 0,
          count_checks: countChecks,
          spec_units_checked: quantity.specUnitsChecked,
          spec_units_passed: quantity.specUnitsPassed,
          weighing_moisture_note: quantity.weighingMoistureNote || null,
          notes: quantity.notes || null,
        },
        { onConflict: "batch_id" },
      );
    if (quantityError) return { error: quantityError.message };
    const { error: docError } = await supabase
      .from("documentation_checks")
      .upsert(
        {
          batch_id: batchId,
          has_production_date: documentation.hasProductionDate,
          has_multi_angle_photos: documentation.hasMultiAnglePhotos,
          has_lot_number: documentation.hasLotNumber,
          has_lab_test: documentation.hasLabTest,
        },
        { onConflict: "batch_id" },
      );
    if (docError) return { error: docError.message };
    // Periksa status lagi sebelum append hasil: temuan Non-B3 menghentikan submit.
    const { data: claimed, error: claimError } = await supabase
      .from("batches")
      .update({ status: "computed" })
      .eq("id", batchId)
      .eq("status", "grading")
      .select("id")
      .maybeSingle<{ id: string }>();
    if (claimError || !claimed) return { error: ERRORS.gradingNotAllowed };
    const { error: resultError } = await supabase
      .from("grading_results")
      .insert({
        batch_id: batchId,
        purity_score: result.purityScore,
        cleanliness_score: result.cleanlinessScore,
        consistency_score: result.consistencyScore,
        quantity_score: result.quantityScore,
        documentation_score: result.documentationScore,
        final_score: result.finalScore,
        grade: result.grade,
        breakdown_json: result.breakdown,
        scoring_version: result.scoringVersion,
        submitted_by: user.id,
      });
    if (resultError) {
      await supabase
        .from("batches")
        .update({ status: "grading" })
        .eq("id", batchId)
        .eq("status", "computed");
      return { error: resultError.message };
    }
    const { error: assignmentError } = await supabase
      .from("assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);
    if (assignmentError) return { error: assignmentError.message };
    await writeAudit(supabase, {
      actorId: user.id,
      action: "grading.submitted",
      entityType: "batch",
      entityId: batchId,
      payload: {
        final_score: result.finalScore,
        grade: result.grade,
        scoring_version: result.scoringVersion,
        nonB3Reconfirmed,
      },
    });
    revalidatePath("/grader");
    revalidatePath(`/grader/batches/${batchId}`);
    revalidatePath(`/factory/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ScoringError)
      return { error: error.message };
    throw error;
  }
}

/** P12/A35: kontaminasi kimia yang baru ditemukan tetap gagal gerbang. */
export async function rejectNonB3FindingAction(
  batchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user, supabase, assignmentId } = await requireAssignment(batchId);
    const parsed = nonB3FindingSchema.safeParse({
      notes: String(formData.get("notes") ?? ""),
    });
    if (!parsed.success)
      return {
        fieldErrors: {
          notes: parsed.error.issues[0]?.message ?? ERRORS.generic,
        },
      };
    const [
      { data: batch },
      { data: previous, error: previousError },
      { data: gate },
    ] = await Promise.all([
      supabase
        .from("batches")
        .select("status")
        .eq("id", batchId)
        .maybeSingle<{ status: string }>(),
      supabase
        .from("grading_results")
        .select("id")
        .eq("batch_id", batchId)
        .limit(1)
        .maybeSingle<{ id: string }>(),
      supabase
        .from("gate_checks")
        .select("*")
        .eq("batch_id", batchId)
        .maybeSingle<GateCheckRow>(),
    ]);
    if (previousError) return { error: ERRORS.generic };
    if (batch?.status !== "grading" || previous || !gate)
      return { error: REVISION_TEXT.nonB3FindingNotAllowed };
    const { data: changed, error: statusError } = await supabase
      .from("batches")
      .update({ status: "rejected_gate" })
      .eq("id", batchId)
      .eq("status", "grading")
      .select("id")
      .maybeSingle<{ id: string }>();
    if (statusError || !changed)
      return { error: REVISION_TEXT.nonB3FindingNotAllowed };
    const { error: gateError } = await supabase
      .from("gate_checks")
      .upsert(
        {
          batch_id: batchId,
          non_b3_pass: false,
          origin_exists_pass: gate.origin_exists_pass,
          origin_authentic_pass: gate.origin_authentic_pass,
          notes: [
            gate.notes,
            `${REVISION_TEXT.findingAuditPrefix} ${parsed.data.notes}`,
          ]
            .filter(Boolean)
            .join("\n"),
          checked_by: user.id,
          checked_at: new Date().toISOString(),
        },
        { onConflict: "batch_id" },
      );
    if (gateError) {
      await supabase
        .from("batches")
        .update({ status: "grading" })
        .eq("id", batchId)
        .eq("status", "rejected_gate");
      return { error: gateError.message };
    }
    const { error: assignmentError } = await supabase
      .from("assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);
    if (assignmentError) return { error: assignmentError.message };
    await writeAudit(supabase, {
      actorId: user.id,
      action: "batch.gate_rejected_late",
      entityType: "batch",
      entityId: batchId,
      payload: { notes: parsed.data.notes },
    });
    revalidatePath("/grader");
    revalidatePath(`/grader/batches/${batchId}`);
    revalidatePath("/factory");
    revalidatePath(`/factory/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Mencatat foto titik sampel yang sudah diunggah client ke Storage.
 * Parameter posisional supaya bisa di-bind dari Server Component.
 */
export async function attachSamplePhotoAction(
  batchId: string,
  point: SamplePointDb,
  filePath: string,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAssignment(batchId);

    const { error } = await supabase.from("batch_photos").insert({
      batch_id: batchId,
      sample_point: point,
      file_path: filePath,
      angle_label: null,
    });
    if (error) return { error: error.message };

    revalidatePath(`/grader/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

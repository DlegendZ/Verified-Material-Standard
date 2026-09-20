"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import {
  ScoringError,
  computeGrading,
  type CategoryConfig,
  type GradingInput,
  type SamplePointInput,
} from "@/lib/scoring";
import { AuthorizationError, createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { ERRORS } from "@/lib/text";
import type { CategoryCriterionRow, SamplePointDb } from "@/lib/types/db";
import { gateCheckSchema, gradingSubmitSchema } from "@/lib/validation/schemas";

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

  if (!assignment) throw new AuthorizationError("Batch ini tidak ditugaskan kepadamu.");
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
      parsed.data.nonB3Pass && parsed.data.originExistsPass && parsed.data.originAuthenticPass;

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

function toCategoryConfig(
  code: string,
  name: string,
  rows: CategoryCriterionRow[],
): CategoryConfig {
  return {
    code,
    name,
    criteria: rows.map((row) => ({
      criterion: row.criterion,
      subKey: row.sub_key,
      label: row.label,
      weightPct: Number(row.weight_pct),
      isOdor: row.is_odor,
      odorOverrideCap: row.odor_override_cap,
    })),
  };
}

/**
 * Menghitung dan menyimpan hasil grading.
 *
 * Rumusnya TIDAK ditulis ulang di sini — seluruh perhitungan dilakukan
 * `lib/scoring`, lalu hasilnya disimpan apa adanya beserta versi rumusnya,
 * supaya sertifikat lama tidak berubah bila rumus diubah kemudian
 * (SRD Bab 4.3).
 */
export async function submitGradingAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = gradingSubmitSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? ERRORS.generic };
    }

    const { batchId, samplePoints, quantity, documentation } = parsed.data;
    const { user, supabase, assignmentId } = await requireAssignment(batchId);

    const { data: batch } = await supabase
      .from("batches")
      .select("id, claimed_weight_kg, category_id, status, material_categories(code, name)")
      .eq("id", batchId)
      .maybeSingle<{
        id: string;
        claimed_weight_kg: number;
        category_id: string;
        status: string;
        material_categories: { code: string; name: string } | null;
      }>();
    if (!batch) return { error: "Batch tidak ditemukan." };
    if (batch.status === "rejected_gate") {
      return { error: "Batch ini gagal di gerbang wajib, penilaian tidak bisa dilanjutkan." };
    }

    const { data: criteriaRows } = await supabase
      .from("category_criteria")
      .select("*")
      .eq("category_id", batch.category_id)
      .order("sort_order", { ascending: true })
      .returns<CategoryCriterionRow[]>();

    const category = toCategoryConfig(
      batch.material_categories?.code ?? "unknown",
      batch.material_categories?.name ?? "—",
      criteriaRows ?? [],
    );

    const gradingInput: GradingInput = {
      category,
      samplePoints: samplePoints.map<SamplePointInput>((point) => ({
        point: point.point,
        odorLevel: point.odorLevel,
        scores: point.scores,
      })),
      quantity: {
        claimedWeightKg: Number(batch.claimed_weight_kg),
        actualWeightKg: quantity.actualWeightKg,
        specMatchPct: quantity.specMatchPct,
      },
      documentation,
    };

    let result;
    try {
      result = computeGrading(gradingInput);
    } catch (error) {
      if (error instanceof ScoringError) return { error: error.message };
      throw error;
    }

    // Titik sampel ditulis ulang supaya submit berulang tidak menumpuk baris.
    await supabase.from("sample_points").delete().eq("batch_id", batchId);

    for (const point of samplePoints) {
      const { data: inserted, error: pointError } = await supabase
        .from("sample_points")
        .insert({
          batch_id: batchId,
          point: point.point as SamplePointDb,
          odor_level: point.odorLevel,
          notes: point.notes || null,
        })
        .select("id")
        .single<{ id: string }>();
      if (pointError || !inserted) return { error: pointError?.message ?? ERRORS.generic };

      const scoreRows = (criteriaRows ?? [])
        .filter((row) => row.criterion !== "quantity_accuracy")
        .map((row) => ({
          sample_point_id: inserted.id,
          criterion: row.criterion,
          sub_key: row.sub_key,
          raw_score: point.scores[row.sub_key] ?? 0,
        }));

      const { error: scoreError } = await supabase.from("sample_scores").insert(scoreRows);
      if (scoreError) return { error: scoreError.message };
    }

    const { error: quantityError } = await supabase.from("quantity_checks").upsert(
      {
        batch_id: batchId,
        actual_weight_kg: quantity.actualWeightKg,
        spec_match_pct: quantity.specMatchPct,
        notes: quantity.notes || null,
      },
      { onConflict: "batch_id" },
    );
    if (quantityError) return { error: quantityError.message };

    const { error: docError } = await supabase.from("documentation_checks").upsert(
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

    // grading_results append-only: regrading membuat baris baru, tidak menimpa.
    const { error: resultError } = await supabase.from("grading_results").insert({
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
    if (resultError) return { error: resultError.message };

    await supabase.from("batches").update({ status: "computed" }).eq("id", batchId);
    await supabase.from("assignments").update({ status: "submitted" }).eq("id", assignmentId);

    await writeAudit(supabase, {
      actorId: user.id,
      action: "grading.submitted",
      entityType: "batch",
      entityId: batchId,
      payload: {
        final_score: result.finalScore,
        grade: result.grade,
        scoring_version: result.scoringVersion,
      },
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

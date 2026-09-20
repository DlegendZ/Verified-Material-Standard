"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import {
  generateCertificateCode,
  validUntilFrom,
} from "@/lib/certificate";
import { renderCertificatePdf, renderQrPng } from "@/lib/certificate-assets";
import { certificateValidityDays } from "@/lib/env";
import { CERTIFIABLE_GRADES, FINAL_WEIGHTS } from "@/lib/scoring";
import { BUCKETS } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AuthorizationError, createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { ERRORS } from "@/lib/text";
import type { GradingResultRow } from "@/lib/types/db";
import {
  assignGraderSchema,
  categoryWeightsSchema,
  revokeCertificateSchema,
} from "@/lib/validation/schemas";

export interface ActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** Verifikasi atau penolakan pabrik oleh Admin. */
export async function setFactoryVerificationAction(
  factoryId: string,
  status: "verified" | "rejected",
): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("factories")
      .update({
        verification_status: status,
        verified_by: admin.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", factoryId);

    if (error) return { error: error.message };

    await writeAudit(supabase, {
      actorId: admin.id,
      action: status === "verified" ? "factory.verified" : "factory.rejected",
      entityType: "factory",
      entityId: factoryId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/factories");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/** Menugaskan grader ke batch; batch berpindah ke status assigned. */
export async function assignGraderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");
    const parsed = assignGraderSchema.safeParse({
      batchId: String(formData.get("batchId") ?? ""),
      graderId: String(formData.get("graderId") ?? ""),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? ERRORS.generic };

    const supabase = await createSupabaseServerClient();

    const { error: assignError } = await supabase.from("assignments").insert({
      batch_id: parsed.data.batchId,
      grader_id: parsed.data.graderId,
      assigned_by: admin.id,
      status: "open",
    });
    if (assignError) return { error: assignError.message };

    const { error: statusError } = await supabase
      .from("batches")
      .update({ status: "assigned" })
      .eq("id", parsed.data.batchId);
    if (statusError) return { error: statusError.message };

    await writeAudit(supabase, {
      actorId: admin.id,
      action: "batch.assigned",
      entityType: "batch",
      entityId: parsed.data.batchId,
      payload: { grader_id: parsed.data.graderId },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/batches/${parsed.data.batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

interface IssueContext {
  batch_code: string;
  claimed_weight_kg: number;
  lot_number: string | null;
  production_date: string | null;
  material_categories: { name: string } | null;
  factories: { legal_name: string; city: string } | null;
}

/**
 * Menerbitkan sertifikat. Hanya Admin, hanya grade A/B/C (SRD Bab 9.1).
 *
 * Render QR & PDF memakai service role karena aset sertifikat ditulis atas nama
 * sistem, bukan atas nama pengguna — perannya sudah divalidasi di baris pertama.
 */
export async function issueCertificateAction(batchId: string): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");
    const supabase = await createSupabaseServerClient();

    const { data: grading } = await supabase
      .from("grading_results")
      .select("*")
      .eq("batch_id", batchId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle<GradingResultRow>();

    if (!grading) return { error: "Batch ini belum punya hasil penilaian." };
    if (!CERTIFIABLE_GRADES.includes(grading.grade)) {
      return { error: ERRORS.gradeDNotCertifiable };
    }

    const { data: existing } = await supabase
      .from("certificates")
      .select("id")
      .eq("batch_id", batchId)
      .eq("status", "issued")
      .maybeSingle<{ id: string }>();
    if (existing) return { error: "Sertifikat untuk batch ini sudah terbit." };

    const { data: batch } = await supabase
      .from("batches")
      .select(
        "batch_code, claimed_weight_kg, lot_number, production_date, material_categories(name), factories(legal_name, city)",
      )
      .eq("id", batchId)
      .maybeSingle<IssueContext>();
    if (!batch) return { error: "Batch tidak ditemukan." };

    const issuedAt = new Date();
    const validUntil = validUntilFrom(issuedAt, certificateValidityDays());
    const certificateCode = generateCertificateCode(issuedAt);

    const pdf = await renderCertificatePdf({
      certificateCode,
      grade: grading.grade,
      finalScore: grading.final_score,
      factoryName: batch.factories?.legal_name ?? "—",
      factoryCity: batch.factories?.city ?? "—",
      categoryName: batch.material_categories?.name ?? "—",
      batchCode: batch.batch_code,
      lotNumber: batch.lot_number,
      claimedWeightKg: Number(batch.claimed_weight_kg),
      productionDate: batch.production_date,
      sampledAt: grading.computed_at,
      issuedAt: issuedAt.toISOString(),
      validUntil: validUntil.toISOString(),
      criteria: [
        { label: "Kemurnian/Komposisi", score: Number(grading.purity_score), weightPct: FINAL_WEIGHTS.purity },
        { label: "Kebersihan & Kontaminasi", score: Number(grading.cleanliness_score), weightPct: FINAL_WEIGHTS.cleanliness },
        { label: "Konsistensi Batch", score: Number(grading.consistency_score), weightPct: FINAL_WEIGHTS.consistency },
        { label: "Akurasi Kuantitas & Spesifikasi", score: Number(grading.quantity_score), weightPct: FINAL_WEIGHTS.quantity },
        { label: "Kelengkapan Dokumentasi", score: Number(grading.documentation_score), weightPct: FINAL_WEIGHTS.documentation },
      ],
    });
    const qr = await renderQrPng(certificateCode);

    const storage = createSupabaseAdminClient().storage.from(BUCKETS.certificates);
    const pdfPath = `${certificateCode}/sertifikat.pdf`;
    const qrPath = `${certificateCode}/qr.png`;

    const [pdfUpload, qrUpload] = await Promise.all([
      storage.upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true }),
      storage.upload(qrPath, qr, { contentType: "image/png", upsert: true }),
    ]);
    if (pdfUpload.error || qrUpload.error) {
      return { error: `Gagal menyimpan aset sertifikat: ${(pdfUpload.error ?? qrUpload.error)?.message}` };
    }

    const { error: insertError } = await supabase.from("certificates").insert({
      batch_id: batchId,
      grading_result_id: grading.id,
      certificate_code: certificateCode,
      issued_by: admin.id,
      issued_at: issuedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      status: "issued",
      qr_path: qrPath,
      pdf_path: pdfPath,
    });
    if (insertError) return { error: insertError.message };

    await supabase.from("batches").update({ status: "certified" }).eq("id", batchId);

    await writeAudit(supabase, {
      actorId: admin.id,
      action: "certificate.issued",
      entityType: "certificate",
      entityId: null,
      payload: { batch_id: batchId, certificate_code: certificateCode, grade: grading.grade },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/batches/${batchId}`);
    revalidatePath("/admin/certificates");
    return { ok: true, message: `Sertifikat ${certificateCode} terbit.` };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/** Menandai batch grade D sebagai tidak lolos sertifikasi. */
export async function markNotCertifiedAction(batchId: string): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("batches")
      .update({ status: "not_certified" })
      .eq("id", batchId);
    if (error) return { error: error.message };

    await writeAudit(supabase, {
      actorId: admin.id,
      action: "batch.not_certified",
      entityType: "batch",
      entityId: batchId,
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Mencabut sertifikat. Halaman publiknya tetap bisa dibuka, tapi menampilkan
 * status TIDAK BERLAKU secara mencolok (SRD Bab 5.3).
 */
export async function revokeCertificateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");
    const parsed = revokeCertificateSchema.safeParse({
      certificateId: String(formData.get("certificateId") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? ERRORS.generic };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("certificates")
      .update({ status: "revoked", revoke_reason: parsed.data.reason })
      .eq("id", parsed.data.certificateId);
    if (error) return { error: error.message };

    await writeAudit(supabase, {
      actorId: admin.id,
      action: "certificate.revoked",
      entityType: "certificate",
      entityId: parsed.data.certificateId,
      payload: { reason: parsed.data.reason },
    });

    revalidatePath("/admin/certificates");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Mengubah bobot sub-kriteria kategori.
 * Jumlah bobot per kriteria wajib tepat 100 — ditolak, bukan dinormalisasi.
 */
export async function updateCategoryWeightsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireRole("admin");

    const rows: { id: string; criterion: string; weightPct: number }[] = [];
    for (const [key, value] of formData.entries()) {
      const match = /^weight:(.+):(purity|cleanliness|quantity_accuracy)$/.exec(key);
      if (!match) continue;
      rows.push({
        id: match[1],
        criterion: match[2],
        weightPct: Number(String(value).replace(",", ".")),
      });
    }

    const parsed = categoryWeightsSchema.safeParse({
      categoryId: String(formData.get("categoryId") ?? ""),
      weights: rows,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? ERRORS.generic };

    const supabase = await createSupabaseServerClient();
    for (const row of parsed.data.weights) {
      const { error } = await supabase
        .from("category_criteria")
        .update({ weight_pct: row.weightPct })
        .eq("id", row.id);
      if (error) return { error: error.message };
    }

    await writeAudit(supabase, {
      actorId: admin.id,
      action: "category.weights_updated",
      entityType: "material_category",
      entityId: parsed.data.categoryId,
      payload: { weights: parsed.data.weights },
    });

    revalidatePath("/admin/categories");
    return { ok: true, message: "Bobot tersimpan." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

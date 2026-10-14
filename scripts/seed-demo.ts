/** Seed demo manual. Hanya manusia menjalankan ke DB; rumus memakai engine yang sama. */
import QRCode from "qrcode";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_SPECS } from "./demo-specs";
import { computeGrading } from "../lib/scoring";
import { toCategoryConfig, toFormProfile } from "../lib/category-config";
import { canonicalCountChecks } from "../lib/grading-input";
import {
  claimedSpecSummary,
  generateCertificateCode,
  validUntilFrom,
  verificationUrl,
} from "../lib/certificate";
import { normalizeSupabaseUrl } from "../lib/env";
import type {
  CategoryCriterionRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "../lib/types/db";
const DAY = 86_400_000;
function env(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} belum diisi. Jalankan npm run seed:demo dengan .env.local yang lengkap.`,
    );
  return value;
}
function check(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}
async function upload(
  client: SupabaseClient,
  bucket: string,
  path: string,
  body: Blob | Buffer,
  contentType: string,
) {
  const { error } = await client.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });
  check(error, `Unggah ${bucket}`);
}
function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function photo(label: string, point: string): Blob {
  return new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#2255A7"/><rect x="25" y="25" width="750" height="550" rx="20" fill="none" stroke="#B6D6FF"/><text x="55" y="270" font-family="Arial" font-size="36" fill="white">Kayu Solid — ${escapeXml(label)}</text><text x="55" y="330" font-family="Arial" font-size="28" fill="white">${escapeXml(point)}</text><text x="55" y="530" font-family="Arial" font-size="22" fill="white">Contoh foto untuk demo VMS</text></svg>`,
    ],
    { type: "image/svg+xml" },
  );
}
async function profileId(
  client: SupabaseClient,
  role: string,
): Promise<string> {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", role)
    .limit(1)
    .single<{ id: string }>();
  check(error, `Akun ${role}`);
  if (!data) throw new Error(`Akun ${role} belum ada. Jalankan seed.sql dulu.`);
  return data.id;
}
async function main() {
  const client = createClient(
    normalizeSupabaseUrl(env("NEXT_PUBLIC_SUPABASE_URL")),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: category, error: categoryError } = await client
    .from("material_categories")
    .select("*")
    .eq("code", "solid_wood")
    .eq("is_active", true)
    .single<MaterialCategoryRow>();
  check(
    categoryError,
    "Kategori Kayu Solid belum tersedia; jalankan migrasi 0004 + seed.sql dan tunggu cache skema",
  );
  if (!category) throw new Error("Kategori Kayu Solid tidak ditemukan.");
  const [
    { data: criteria, error: criteriaError },
    { data: profiles, error: profilesError },
    { data: factory, error: factoryError },
    adminId,
    graderId,
  ] = await Promise.all([
    client
      .from("category_criteria")
      .select("*")
      .eq("category_id", category.id)
      .order("sort_order")
      .returns<CategoryCriterionRow[]>(),
    client
      .from("material_form_profiles")
      .select("*")
      .eq("category_id", category.id)
      .eq("is_active", true)
      .returns<MaterialFormProfileRow[]>(),
    client
      .from("factories")
      .select("id")
      .eq("id", "aaaaaaaa-0000-4000-8000-000000000001")
      .single<{ id: string }>(),
    profileId(client, "admin"),
    profileId(client, "grader"),
  ]);
  check(criteriaError, "Sub-kriteria");
  check(profilesError, "Profil bentuk");
  check(factoryError, "Pabrik demo");
  if (!factory) throw new Error("UD Mebel Contoh belum tersedia.");
  const config = toCategoryConfig(category, criteria ?? []);
  // Ganti hanya batch demo berawalan DEMO-; data lain tetap utuh.
  const { error: deleteError } = await client
    .from("batches")
    .delete()
    .like("batch_code", "DEMO-%");
  check(deleteError, "Mengganti batch demo lama");
  for (const spec of DEMO_SPECS) {
    const profile = profiles?.find((p) => p.code === spec.profileCode);
    if (!profile) throw new Error(`Profil ${spec.profileCode} belum tersedia.`);
    const now = new Date();
    const issuedAt = spec.expired ? new Date(now.getTime() - 50 * DAY) : now;
    const computedAt = new Date(
      issuedAt.getTime() - (spec.expired ? DAY : 3_600_000),
    );
    const { data: batch, error: batchError } = await client
      .from("batches")
      .insert({
        factory_id: factory.id,
        category_id: category.id,
        form_profile_id: profile.id,
        batch_code: spec.batchCode,
        declared_material_type: spec.declaredMaterialType,
        claimed_weight_kg: spec.claimedWeightKg,
        claimed_spec_detail: spec.claimedSpecDetail,
        claimed_spec: claimedSpecSummary(
          spec.claimedSpecDetail,
          profile,
          spec.declaredMaterialType,
          spec.claimedWeightKg,
        ),
        intake_declarations: {
          sourceIsProductionResidue: true,
          noChemicalTreatment: true,
          singleForm: true,
          declaredAt: new Date(issuedAt.getTime() - 2 * DAY).toISOString(),
        },
        production_date: spec.productionDate || null,
        lot_number: spec.lotNumber || null,
        description: spec.description,
        status: spec.outcome === "rejected_gate" ? "rejected_gate" : "grading",
        created_at: new Date(issuedAt.getTime() - 2 * DAY).toISOString(),
        updated_at: issuedAt.toISOString(),
      })
      .select("id")
      .single<{ id: string }>();
    check(batchError, spec.batchCode);
    if (!batch) throw new Error("Batch demo gagal dibuat.");
    const gate = spec.gate ?? {
      nonB3Pass: true,
      originExistsPass: true,
      originAuthenticPass: true,
      notes:
        "Pemeriksaan contoh: tidak ditemukan kontaminasi kimia; unit kontaminan yang tidak lolos hanya paku/sekrup tertanam.",
    };
    const { error: assignmentError } = await client
      .from("assignments")
      .insert({
        batch_id: batch.id,
        grader_id: graderId,
        assigned_by: adminId,
        assigned_at: new Date(computedAt.getTime() - 3_600_000).toISOString(),
        status: "submitted",
      });
    check(assignmentError, "Penugasan demo");
    const { error: gateError } = await client
      .from("gate_checks")
      .insert({
        batch_id: batch.id,
        non_b3_pass: gate.nonB3Pass,
        origin_exists_pass: gate.originExistsPass,
        origin_authentic_pass: gate.originAuthenticPass,
        notes: gate.notes,
        checked_by: graderId,
        checked_at: computedAt.toISOString(),
      });
    check(gateError, "Gerbang demo");
    const originPath = `${batch.id}/nota-demo.txt`;
    await upload(
      client,
      "batch-documents",
      originPath,
      new Blob([
        `Dokumen contoh asal-usul UD Mebel Contoh untuk ${spec.batchCode}. Bukan dokumen pabrik nyata.`,
      ]),
      "text/plain",
    );
    const { error: originError } = await client
      .from("batch_documents")
      .insert({
        batch_id: batch.id,
        kind: "origin_doc",
        file_path: originPath,
        uploaded_at: computedAt.toISOString(),
      });
    check(originError, "Dokumen asal-usul demo");
    if (spec.documentation.hasLabTest) {
      const path = `${batch.id}/uji-demo.txt`;
      await upload(
        client,
        "batch-documents",
        path,
        new Blob(["Hasil uji tambahan fiktif untuk demo VMS."]),
        "text/plain",
      );
      const { error } = await client
        .from("batch_documents")
        .insert({
          batch_id: batch.id,
          kind: "lab_test",
          file_path: path,
          uploaded_at: computedAt.toISOString(),
        });
      check(error, "Uji tambahan demo");
    }
    if (
      spec.documentation.hasMultiAnglePhotos ||
      spec.outcome === "rejected_gate"
    ) {
      for (const angle of ["Tampak depan", "Tampak samping"]) {
        const path = `${batch.id}/batch-${angle.endsWith("depan") ? "depan" : "samping"}.svg`;
        await upload(
          client,
          "batch-photos",
          path,
          photo(spec.batchCode, angle),
          "image/svg+xml",
        );
        const { error } = await client
          .from("batch_photos")
          .insert({
            batch_id: batch.id,
            file_path: path,
            sample_point: null,
            angle_label: angle,
            uploaded_at: computedAt.toISOString(),
          });
        check(error, "Foto batch demo");
      }
    }
    if (spec.outcome === "rejected_gate") {
      console.log(
        `${spec.batchCode}: ditolak di gerbang (tanpa skor/sertifikat)`,
      );
      continue;
    }
    const countChecks = canonicalCountChecks(
      spec.claimedSpecDetail,
      spec.quantity.countChecks,
    );
    const result = computeGrading({
      category: config,
      samplingProfile: toFormProfile(profile),
      samplePoints: spec.samplePoints,
      quantity: {
        claimedWeightKg: spec.claimedWeightKg,
        actualWeightKg: spec.quantity.actualWeightKg,
        countChecks,
        specUnits: spec.quantity.specUnits,
      },
      documentation: spec.documentation,
    });
    for (const point of spec.samplePoints) {
      const { data: inserted, error } = await client
        .from("sample_points")
        .insert({
          batch_id: batch.id,
          point: point.point,
          odor_level: point.odorLevel,
          notes: "Data fiktif Lampiran B.",
        })
        .select("id")
        .single<{ id: string }>();
      check(error, "Titik demo");
      if (!inserted) throw new Error("Titik gagal dibuat.");
      const scores = result.breakdown.samplePoints
        .find((p) => p.point === point.point)!
        .contributions.filter((s) => s.rawScore !== null)
        .map((s) => ({
          sample_point_id: inserted.id,
          criterion: s.criterion,
          sub_key: s.subKey,
          raw_score: s.rawScore,
          units_checked: s.unitsChecked,
          units_passed: s.unitsPassed,
          measurement_method: s.measurementMethod,
        }));
      const { error: scoresError } = await client
        .from("sample_scores")
        .insert(scores);
      check(scoresError, "Skor mentah demo");
      if (spec.documentation.hasMultiAnglePhotos) {
        const path = `${batch.id}/titik-${point.point}.svg`;
        await upload(
          client,
          "batch-photos",
          path,
          photo(
            spec.batchCode,
            `Titik ${point.point === "top" ? "Atas" : point.point === "middle" ? "Tengah" : "Bawah"}`,
          ),
          "image/svg+xml",
        );
        const { error: photoError } = await client
          .from("batch_photos")
          .insert({
            batch_id: batch.id,
            file_path: path,
            sample_point: point.point,
            angle_label: null,
            uploaded_at: computedAt.toISOString(),
          });
        check(photoError, "Foto titik demo");
      }
    }
    const { error: quantityError } = await client
      .from("quantity_checks")
      .insert({
        batch_id: batch.id,
        actual_weight_kg: spec.quantity.actualWeightKg,
        spec_match_pct: result.breakdown.quantity.specMatchPct,
        count_checks: countChecks,
        spec_units_passed: spec.quantity.specUnits.passed,
        spec_units_checked: spec.quantity.specUnits.checked,
        weighing_moisture_note: spec.weighingMoistureNote || null,
        notes: null,
      });
    check(quantityError, "Kuantitas demo");
    const { error: docError } = await client
      .from("documentation_checks")
      .insert({
        batch_id: batch.id,
        has_production_date: spec.documentation.hasProductionDate,
        has_multi_angle_photos: spec.documentation.hasMultiAnglePhotos,
        has_lot_number: spec.documentation.hasLotNumber,
        has_lab_test: spec.documentation.hasLabTest,
      });
    check(docError, "Dokumentasi demo");
    const { data: grading, error: gradingError } = await client
      .from("grading_results")
      .insert({
        batch_id: batch.id,
        purity_score: result.purityScore,
        cleanliness_score: result.cleanlinessScore,
        consistency_score: result.consistencyScore,
        quantity_score: result.quantityScore,
        documentation_score: result.documentationScore,
        final_score: result.finalScore,
        grade: result.grade,
        breakdown_json: result.breakdown,
        scoring_version: result.scoringVersion,
        submitted_by: graderId,
        computed_at: computedAt.toISOString(),
      })
      .select("id")
      .single<{ id: string }>();
    check(gradingError, "Hasil grading demo");
    if (!grading) throw new Error("Hasil gagal disimpan.");
    if (spec.outcome === "not_certified") {
      const { error } = await client
        .from("batches")
        .update({ status: "not_certified" })
        .eq("id", batch.id);
      check(error, "Status tidak lolos");
      console.log(
        `${spec.batchCode}: ${result.finalScore} / Grade ${result.grade} — tidak lolos`,
      );
      continue;
    }
    if (!category.certificate_validity_days)
      throw new Error(
        "Masa berlaku kategori belum ditetapkan; sertifikat tidak diterbitkan.",
      );
    const code = generateCertificateCode(issuedAt);
    const validUntil = validUntilFrom(
      issuedAt,
      category.certificate_validity_days,
    );
    const qrPath = `${code}/qr.png`;
    await upload(
      client,
      "certificates",
      qrPath,
      await QRCode.toBuffer(verificationUrl(code), {
        type: "png",
        width: 600,
        margin: 1,
        errorCorrectionLevel: "M",
      }),
      "image/png",
    );
    const { error: certError } = await client
      .from("certificates")
      .insert({
        batch_id: batch.id,
        grading_result_id: grading.id,
        certificate_code: code,
        issued_by: adminId,
        issued_at: issuedAt.toISOString(),
        valid_until: validUntil.toISOString(),
        status: spec.outcome === "revoked" ? "revoked" : "issued",
        revoke_reason: spec.revokeReason ?? null,
        qr_path: qrPath,
        pdf_path: null,
      });
    check(certError, "Sertifikat demo");
    const { error: statusError } = await client
      .from("batches")
      .update({ status: "certified", updated_at: issuedAt.toISOString() })
      .eq("id", batch.id);
    check(statusError, "Status sertifikat demo");
    console.log(
      `${spec.batchCode}: ${result.finalScore} / Grade ${result.grade}${spec.expired ? " — KEDALUWARSA" : spec.outcome === "revoked" ? " — TIDAK BERLAKU" : ""}\n  ${code}\n  ${verificationUrl(code)}`,
    );
  }
  console.warn(
    "QR demo dibuat. PDF dilewati oleh skrip (A17); PDF dirender aplikasi ketika Admin menerbitkan sertifikat pada alur pengajuan baru.",
  );
  console.log(
    "7 batch demo Kayu Solid siap. Pakai kode DEMO-B-002 untuk E2E_CERTIFICATE_CODE.",
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

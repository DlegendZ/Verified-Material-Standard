/**
 * Seed data demo: batch, hasil grading, dan sertifikat (SRD Bab 13.1).
 *
 * Sengaja TIDAK ditulis sebagai SQL. Angka di `grading_results.breakdown_json`
 * harus keluar dari scoring engine yang sama dengan yang dipakai aplikasi —
 * menulis ulang rumusnya dalam SQL berarti ada dua sumber kebenaran yang pasti
 * akan berbeda suatu hari (keputusan A4 di DECISIONS.md).
 *
 * Jalankan: npm run seed:demo
 * Aman diulang: seluruh batch demo dihapus lebih dulu lalu dibuat ulang.
 */
import QRCode from "qrcode";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  computeGrading,
  type CategoryConfig,
  type DocumentationInput,
  type GradingResult,
  type SamplePointInput,
} from "../lib/scoring";
import { generateCertificateCode, validUntilFrom, verificationUrl } from "../lib/certificate";
import { normalizeSupabaseUrl } from "../lib/env";
import type { CategoryCriterionRow } from "../lib/types/db";

const BATCH_PREFIX = "DEMO";
const VALIDITY_DAYS = Number(process.env.CERTIFICATE_VALIDITY_DAYS ?? 90);

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} belum diisi. Jalankan dengan .env.local yang lengkap: npm run seed:demo`,
    );
  }
  return value;
}

/** Memakai normalisasi yang sama dengan aplikasi. */
function envUrl(name: string): string {
  return normalizeSupabaseUrl(env(name));
}

const supabase: SupabaseClient = createClient(
  envUrl("NEXT_PUBLIC_SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Placeholder foto: blok warna solid berlabel jelas, bukan gambar rusak. */
function placeholderSvg(label: string, sublabel: string, hex: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${hex}"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3"/>
  <text x="56" y="300" font-family="Helvetica, Arial, sans-serif" font-size="46" fill="#ffffff">${label}</text>
  <text x="56" y="352" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#ffffff" fill-opacity="0.85">${sublabel}</text>
  <text x="56" y="540" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.7">Contoh foto untuk demo VMS</text>
</svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

async function loadCategory(code: string): Promise<{ id: string; config: CategoryConfig }> {
  const { data: category, error } = await supabase
    .from("material_categories")
    .select("id, code, name")
    .eq("code", code)
    .single();
  if (error || !category) {
    throw new Error(
      `Kategori ${code} tidak terbaca lewat API.
` +
        `Pesan Supabase: ${error?.message ?? "tidak ada baris"}
` +
        "Cek: (1) seed.sql sudah dijalankan, (2) NEXT_PUBLIC_SUPABASE_URL dan " +
        "SUPABASE_DB_URL menunjuk project yang sama, (3) skema baru dibuat lewat SQL " +
        "langsung sehingga cache PostgREST perlu di-reload (jalankan ulang perintah ini " +
        "beberapa detik kemudian).",
    );
  }

  const { data: rows } = await supabase
    .from("category_criteria")
    .select("*")
    .eq("category_id", category.id)
    .order("sort_order", { ascending: true })
    .returns<CategoryCriterionRow[]>();

  return {
    id: category.id,
    config: {
      code: category.code,
      name: category.name,
      criteria: (rows ?? []).map((row) => ({
        criterion: row.criterion,
        subKey: row.sub_key,
        label: row.label,
        weightPct: Number(row.weight_pct),
        isOdor: row.is_odor,
        odorOverrideCap: row.odor_override_cap,
      })),
    },
  };
}

async function idOfFactory(legalName: string): Promise<string> {
  const { data } = await supabase
    .from("factories")
    .select("id")
    .eq("legal_name", legalName)
    .maybeSingle();
  if (!data) throw new Error(`Pabrik "${legalName}" belum ada. Jalankan seed.sql dulu.`);
  return data.id as string;
}

async function idOfProfile(role: "admin" | "grader"): Promise<string> {
  const { data } = await supabase.from("profiles").select("id").eq("role", role).limit(1).maybeSingle();
  if (!data) throw new Error(`Akun ${role} belum ada. Jalankan seed.sql dulu.`);
  return data.id as string;
}

interface DemoBatchSpec {
  code: string;
  categoryCode: string;
  factoryName: string;
  claimedWeightKg: number;
  claimedSpec: string;
  lotNumber: string | null;
  productionDate: string | null;
  description: string;
  gate: { nonB3: boolean; originExists: boolean; originAuthentic: boolean; notes?: string };
  sampling?: {
    points: SamplePointInput[];
    actualWeightKg: number;
    specMatchPct: number;
    documentation: DocumentationInput;
  };
  /** issued = sertifikat terbit, revoked = terbit lalu dicabut. */
  outcome: "issued" | "revoked" | "not_certified" | "rejected_gate";
  revokeReason?: string;
  photoColor: string;
}

const TEXTILE_FLAT = (fiber: number, uniform: number, dirt: number, fray: number, odor: number) => ({
  fiber_type_match: fiber,
  uniformity: uniform,
  dirt_level: dirt,
  fraying_level: fray,
  odor,
});

const SPECS: DemoBatchSpec[] = [
  {
    code: `${BATCH_PREFIX}-A-001`,
    categoryCode: "textile",
    factoryName: "PT Sentosa Textile",
    claimedWeightKg: 320,
    claimedSpec: "Kain perca katun, potongan 25–35 cm, warna terang",
    lotNumber: "LOT-A-0912",
    productionDate: "2026-09-02",
    description: "Sisa potongan produksi kemeja katun, sudah disortir warna.",
    gate: { nonB3: true, originExists: true, originAuthentic: true },
    sampling: {
      points: [
        { point: "top", odorLevel: 1, scores: TEXTILE_FLAT(96, 92, 95, 93, 98) },
        { point: "middle", odorLevel: 1, scores: TEXTILE_FLAT(94, 90, 93, 91, 96) },
        { point: "bottom", odorLevel: 1, scores: TEXTILE_FLAT(95, 89, 92, 90, 95) },
      ],
      actualWeightKg: 318,
      specMatchPct: 94,
      documentation: {
        hasProductionDate: true,
        hasMultiAnglePhotos: true,
        hasLotNumber: true,
        hasLabTest: true,
      },
    },
    outcome: "issued",
    photoColor: "#14543A",
  },
  {
    // Kasus persis dari grading-system.md Section 10 / SRD Bab 7.8 → skor 64, grade C.
    code: `${BATCH_PREFIX}-C-002`,
    categoryCode: "textile",
    factoryName: "PT Sentosa Textile",
    claimedWeightKg: 50,
    claimedSpec: "Kain perca campuran, potongan 20–30 cm",
    lotNumber: "LOT-C-0918",
    productionDate: "2026-09-10",
    description: "Kasus contoh dokumen domain: satu titik berbau parah.",
    gate: { nonB3: true, originExists: true, originAuthentic: true },
    sampling: {
      points: [
        { point: "top", odorLevel: 1, scores: TEXTILE_FLAT(90, 80, 90, 85, 95) },
        { point: "middle", odorLevel: 1, scores: TEXTILE_FLAT(88, 85, 85, 80, 90) },
        { point: "bottom", odorLevel: 3, scores: TEXTILE_FLAT(70, 60, 80, 75, 10) },
      ],
      actualWeightKg: 47,
      specMatchPct: 75,
      documentation: {
        hasProductionDate: true,
        hasMultiAnglePhotos: false,
        hasLotNumber: true,
        hasLabTest: false,
      },
    },
    outcome: "issued",
    photoColor: "#8A5810",
  },
  {
    code: `${BATCH_PREFIX}-B-003`,
    categoryCode: "textile",
    factoryName: "PT Sentosa Textile",
    claimedWeightKg: 180,
    claimedSpec: "Kain perca polyester, potongan tidak seragam",
    lotNumber: "LOT-B-0820",
    productionDate: "2026-08-18",
    description: "Batch terkena hujan di gudang setelah sertifikat terbit.",
    gate: { nonB3: true, originExists: true, originAuthentic: true },
    sampling: {
      points: [
        { point: "top", odorLevel: 1, scores: TEXTILE_FLAT(85, 78, 84, 80, 90) },
        { point: "middle", odorLevel: 2, scores: TEXTILE_FLAT(82, 76, 80, 78, 72) },
        { point: "bottom", odorLevel: 1, scores: TEXTILE_FLAT(80, 75, 82, 79, 88) },
      ],
      actualWeightKg: 176,
      specMatchPct: 82,
      documentation: {
        hasProductionDate: true,
        hasMultiAnglePhotos: true,
        hasLotNumber: true,
        hasLabTest: false,
      },
    },
    outcome: "revoked",
    revokeReason:
      "Batch terkena hujan di gudang sebelum terjual sehingga kadar kelembaban berubah signifikan. Wajib disampling ulang dari awal.",
    photoColor: "#1B5878",
  },
  {
    code: `${BATCH_PREFIX}-D-004`,
    categoryCode: "textile",
    factoryName: "PT Sentosa Textile",
    claimedWeightKg: 210,
    claimedSpec: "Kain perca campuran, belum disortir",
    lotNumber: null,
    productionDate: null,
    description: "Batch campur aduk, dua titik berbau parah.",
    gate: { nonB3: true, originExists: true, originAuthentic: true },
    sampling: {
      points: [
        { point: "top", odorLevel: 3, scores: TEXTILE_FLAT(55, 40, 45, 40, 15) },
        { point: "middle", odorLevel: 1, scores: TEXTILE_FLAT(62, 45, 55, 50, 70) },
        { point: "bottom", odorLevel: 3, scores: TEXTILE_FLAT(38, 30, 35, 30, 10) },
      ],
      actualWeightKg: 178,
      specMatchPct: 42,
      documentation: {
        hasProductionDate: false,
        hasMultiAnglePhotos: false,
        hasLotNumber: false,
        hasLabTest: false,
      },
    },
    outcome: "not_certified",
    photoColor: "#8C2F2A",
  },
  {
    code: `${BATCH_PREFIX}-GATE-005`,
    categoryCode: "textile",
    factoryName: "PT Sentosa Textile",
    claimedWeightKg: 90,
    claimedSpec: "Kain perca bekas proses pewarnaan",
    lotNumber: "LOT-X-0901",
    productionDate: "2026-08-30",
    description: "Dokumen asal-usul tidak cocok dengan data pabrik terdaftar.",
    gate: {
      nonB3: true,
      originExists: true,
      originAuthentic: false,
      notes:
        "Kop surat jalan berbeda dengan dokumen legal pabrik dan nomor NPWP tidak cocok. Dokumen diduga rekayasa, proses dihentikan.",
    },
    outcome: "rejected_gate",
    photoColor: "#56605A",
  },
];

async function uploadPhoto(
  batchId: string,
  name: string,
  blob: Blob,
): Promise<string | null> {
  const path = `${batchId}/${name}.svg`;
  const { error } = await supabase.storage
    .from("batch-photos")
    .upload(path, blob, { contentType: "image/svg+xml", upsert: true });
  if (error) {
    console.warn(`  ! gagal unggah foto ${path}: ${error.message}`);
    return null;
  }
  return path;
}

async function uploadCertificateAssets(
  certificateCode: string,
  result: GradingResult,
  spec: DemoBatchSpec,
  sampledAt: string,
  issuedAt: Date,
  validUntil: Date,
): Promise<{ qrPath: string | null; pdfPath: string | null }> {
  const storage = supabase.storage.from("certificates");
  let qrPath: string | null = null;
  let pdfPath: string | null = null;

  // QR dan PDF dibuat terpisah supaya kegagalan salah satunya tidak ikut
  // menghilangkan yang lain. Renderer PDF bergantung pada resolusi paket yang
  // tidak selalu jalan di luar bundler Next; QR tidak punya masalah itu, jadi
  // qrcode dipakai langsung tanpa melewati modul yang mengimpor react-pdf.
  try {
    const qr = await QRCode.toBuffer(verificationUrl(certificateCode), {
      type: "png",
      width: 600,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F1613", light: "#FFFFFF" },
    });
    const path = `${certificateCode}/qr.png`;
    const { error } = await storage.upload(path, qr, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    qrPath = path;
  } catch (error) {
    console.warn(`  ! QR ${certificateCode} gagal dibuat: ${(error as Error).message}`);
  }

  try {
    const assets = await import("../lib/certificate-assets");
    const pdf = await assets.renderCertificatePdf({
      certificateCode,
      grade: result.grade,
      finalScore: result.finalScore,
      factoryName: spec.factoryName,
      factoryCity: "Bandung",
      categoryName: "Tekstil",
      batchCode: spec.code,
      lotNumber: spec.lotNumber,
      claimedWeightKg: spec.claimedWeightKg,
      productionDate: spec.productionDate,
      sampledAt,
      issuedAt: issuedAt.toISOString(),
      validUntil: validUntil.toISOString(),
      criteria: result.breakdown.final.map((row) => ({
        label: row.label,
        score: row.score,
        weightPct: row.weightPct,
      })),
    });
    const path = `${certificateCode}/sertifikat.pdf`;
    const { error } = await storage.upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    pdfPath = path;
  } catch (error) {
    console.warn(
      `  ! PDF ${certificateCode} gagal dibuat di luar Next: ${(error as Error).message}
` +
        "    Sertifikat tetap terbit; PDF-nya dibuat saat Admin menerbitkan dari aplikasi.",
    );
  }

  return { qrPath, pdfPath };
}

async function removeExistingDemoBatches() {
  const { data } = await supabase.from("batches").select("id").like("batch_code", `${BATCH_PREFIX}-%`);
  const ids = (data ?? []).map((row) => row.id as string);
  if (ids.length === 0) return;

  // Menghapus batch ikut menghapus hasil grading lewat cascade. Trigger
  // append-only hanya memblokir UPDATE (lihat migrasi 0003), jadi ini sah.
  const { error } = await supabase.from("batches").delete().in("id", ids);
  if (error) {
    throw new Error(
      `Gagal menghapus batch demo lama: ${error.message}
` +
        "Pastikan migrasi 0003_grading_results_delete.sql sudah dijalankan: " +
        "npm run db:push -- supabase/migrations/0003_grading_results_delete.sql",
    );
  }
  console.log(`Menghapus ${ids.length} batch demo lama.`);
}

async function main() {
  console.log("Seed data demo VMS…");
  await removeExistingDemoBatches();

  const textile = await loadCategory("textile");
  const graderId = await idOfProfile("grader");
  const adminId = await idOfProfile("admin");

  for (const spec of SPECS) {
    const factoryId = await idOfFactory(spec.factoryName);
    const gatePassed = spec.gate.nonB3 && spec.gate.originExists && spec.gate.originAuthentic;

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert({
        factory_id: factoryId,
        category_id: textile.id,
        batch_code: spec.code,
        claimed_weight_kg: spec.claimedWeightKg,
        claimed_spec: spec.claimedSpec,
        production_date: spec.productionDate,
        lot_number: spec.lotNumber,
        description: spec.description,
        status: "submitted",
      })
      .select("id")
      .single();
    if (batchError || !batch) throw new Error(`Gagal membuat ${spec.code}: ${batchError?.message}`);

    const batchId = batch.id as string;

    await supabase.from("assignments").insert({
      batch_id: batchId,
      grader_id: graderId,
      assigned_by: adminId,
      status: gatePassed ? "submitted" : "submitted",
    });

    await supabase.from("gate_checks").insert({
      batch_id: batchId,
      non_b3_pass: spec.gate.nonB3,
      origin_exists_pass: spec.gate.originExists,
      origin_authentic_pass: spec.gate.originAuthentic,
      notes: spec.gate.notes ?? null,
      checked_by: graderId,
    });

    const generalPhoto = await uploadPhoto(
      batchId,
      "batch",
      placeholderSvg("Tekstil — foto batch", spec.code, spec.photoColor),
    );
    if (generalPhoto) {
      await supabase
        .from("batch_photos")
        .insert({ batch_id: batchId, file_path: generalPhoto, sample_point: null, angle_label: "Tumpukan" });
    }

    if (!gatePassed || !spec.sampling) {
      await supabase.from("batches").update({ status: "rejected_gate" }).eq("id", batchId);
      console.log(`  ${spec.code}: ditolak di gerbang wajib.`);
      continue;
    }

    for (const point of spec.sampling.points) {
      const { data: inserted } = await supabase
        .from("sample_points")
        .insert({ batch_id: batchId, point: point.point, odor_level: point.odorLevel })
        .select("id")
        .single();
      if (!inserted) continue;

      const rows = textile.config.criteria
        .filter((criterion) => criterion.criterion !== "quantity_accuracy")
        .map((criterion) => ({
          sample_point_id: inserted.id as string,
          criterion: criterion.criterion,
          sub_key: criterion.subKey,
          raw_score: point.scores[criterion.subKey] ?? 0,
        }));
      await supabase.from("sample_scores").insert(rows);

      const photoPath = await uploadPhoto(
        batchId,
        `titik-${point.point}`,
        placeholderSvg(
          `Titik ${point.point === "top" ? "Atas" : point.point === "middle" ? "Tengah" : "Bawah"}`,
          spec.code,
          spec.photoColor,
        ),
      );
      if (photoPath) {
        await supabase.from("batch_photos").insert({
          batch_id: batchId,
          file_path: photoPath,
          sample_point: point.point,
          angle_label: null,
        });
      }
    }

    await supabase.from("quantity_checks").insert({
      batch_id: batchId,
      actual_weight_kg: spec.sampling.actualWeightKg,
      spec_match_pct: spec.sampling.specMatchPct,
    });

    await supabase.from("documentation_checks").insert({
      batch_id: batchId,
      has_production_date: spec.sampling.documentation.hasProductionDate,
      has_multi_angle_photos: spec.sampling.documentation.hasMultiAnglePhotos,
      has_lot_number: spec.sampling.documentation.hasLotNumber,
      has_lab_test: spec.sampling.documentation.hasLabTest,
    });

    const result = computeGrading({
      category: textile.config,
      samplePoints: spec.sampling.points,
      quantity: {
        claimedWeightKg: spec.claimedWeightKg,
        actualWeightKg: spec.sampling.actualWeightKg,
        specMatchPct: spec.sampling.specMatchPct,
      },
      documentation: spec.sampling.documentation,
    });

    const { data: grading } = await supabase
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
        submitted_by: graderId,
      })
      .select("id, computed_at")
      .single();

    console.log(`  ${spec.code}: skor ${result.finalScore} → grade ${result.grade}`);

    if (spec.outcome === "not_certified" || !grading) {
      await supabase.from("batches").update({ status: "not_certified" }).eq("id", batchId);
      continue;
    }

    const issuedAt = new Date();
    const validUntil = validUntilFrom(issuedAt, VALIDITY_DAYS);
    const certificateCode = generateCertificateCode(issuedAt);
    const assets = await uploadCertificateAssets(
      certificateCode,
      result,
      spec,
      grading.computed_at as string,
      issuedAt,
      validUntil,
    );

    await supabase.from("certificates").insert({
      batch_id: batchId,
      grading_result_id: grading.id,
      certificate_code: certificateCode,
      issued_by: adminId,
      issued_at: issuedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      status: spec.outcome === "revoked" ? "revoked" : "issued",
      revoke_reason: spec.revokeReason ?? null,
      qr_path: assets.qrPath,
      pdf_path: assets.pdfPath,
    });

    await supabase.from("batches").update({ status: "certified" }).eq("id", batchId);
    console.log(
      `    sertifikat ${certificateCode}${spec.outcome === "revoked" ? " (dicabut)" : ""}`,
    );
  }

  console.log("Selesai. Buka /admin untuk melihat antrian, atau /verify/<kode> untuk halaman publik.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

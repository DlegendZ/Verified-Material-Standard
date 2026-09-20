/**
 * VMS Scoring Engine — fungsi murni, tanpa I/O.
 *
 * Aturan main (SRD Bab 4.3):
 *  - tidak mengimpor Supabase / Next.js / fs
 *  - tidak membaca jam sistem, tidak memakai Math.random
 *  - input objek penilaian → output objek hasil, deterministik
 *
 * Sumber kebenaran domain: grading-system.md Section 2-9, SRD Bab 7.
 */
import {
  CONSISTENCY_SCORES,
  CONSISTENCY_SEVERITY,
  DEFAULT_ODOR_OVERRIDE_CAP,
  DOCUMENTATION_ITEMS,
  FINAL_WEIGHTS,
  ODOR_OVERRIDE_LEVEL,
  REQUIRED_SAMPLE_POINTS,
  SCORING_VERSION,
  SPEC_ACCURACY_SUB_KEY,
  WEIGHT_ACCURACY_SUB_KEY,
  WEIGHT_SUM_EPSILON,
  consistencyLevelFromSpread,
  gradeFromFinalScore,
  specAccuracyScore,
  weightAccuracyScore,
} from "./rules";
import type {
  CategoryConfig,
  ConsistencyBreakdown,
  ConsistencyLevel,
  Criterion,
  DocumentationBreakdown,
  DocumentationInput,
  FinalCriterionRow,
  GradingInput,
  GradingResult,
  QuantityBreakdown,
  QuantityInput,
  SamplePointBreakdown,
  SamplePointInput,
  SubContribution,
  SubCriterionConfig,
} from "./types";

export * from "./types";
export * from "./rules";

/** Error domain scoring — selalu punya `code` agar mudah dipetakan ke pesan UI. */
export class ScoringError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScoringError";
    this.code = code;
  }
}

function subsOf(category: CategoryConfig, criterion: Criterion): SubCriterionConfig[] {
  return category.criteria.filter((c) => c.criterion === criterion);
}

/**
 * Memvalidasi konfigurasi kategori.
 *
 * Bobot yang tidak berjumlah 100 WAJIB melempar error, bukan dinormalisasi
 * diam-diam (SRD Bab 7.8) — normalisasi diam-diam menyembunyikan salah input
 * admin dan membuat skor lama tidak bisa direproduksi.
 */
export function validateCategoryConfig(category: CategoryConfig): void {
  const criteria: Criterion[] = ["purity", "cleanliness", "quantity_accuracy"];

  for (const criterion of criteria) {
    const subs = subsOf(category, criterion);
    if (subs.length === 0) {
      throw new ScoringError(
        "CATEGORY_CRITERION_EMPTY",
        `Kategori "${category.code}" tidak punya sub-kriteria untuk ${criterion}.`,
      );
    }

    const seen = new Set<string>();
    for (const sub of subs) {
      if (seen.has(sub.subKey)) {
        throw new ScoringError(
          "CATEGORY_DUPLICATE_SUB_KEY",
          `Sub-kriteria "${sub.subKey}" duplikat pada ${criterion} kategori "${category.code}".`,
        );
      }
      seen.add(sub.subKey);

      if (!Number.isFinite(sub.weightPct) || sub.weightPct < 0) {
        throw new ScoringError(
          "CATEGORY_WEIGHT_INVALID",
          `Bobot sub-kriteria "${sub.subKey}" tidak valid: ${sub.weightPct}.`,
        );
      }
    }

    const total = subs.reduce((acc, sub) => acc + sub.weightPct, 0);
    if (Math.abs(total - 100) > WEIGHT_SUM_EPSILON) {
      throw new ScoringError(
        "CATEGORY_WEIGHT_SUM_INVALID",
        `Jumlah bobot ${criterion} pada kategori "${category.code}" = ${total}, wajib 100.`,
      );
    }
  }

  const odorSubs = category.criteria.filter((c) => c.isOdor);
  if (odorSubs.length !== 1) {
    throw new ScoringError(
      "CATEGORY_ODOR_SUB_INVALID",
      `Kategori "${category.code}" wajib punya tepat 1 sub-kriteria bau, ditemukan ${odorSubs.length}.`,
    );
  }
  if (odorSubs[0].criterion !== "cleanliness") {
    throw new ScoringError(
      "CATEGORY_ODOR_SUB_INVALID",
      `Sub-kriteria bau kategori "${category.code}" wajib berada di kriteria cleanliness.`,
    );
  }
}

/** Cap override bau kategori ini; default 40 bila tidak di-set. */
export function odorOverrideCapOf(category: CategoryConfig): number {
  const odorSub = category.criteria.find((c) => c.isOdor);
  return odorSub?.odorOverrideCap ?? DEFAULT_ODOR_OVERRIDE_CAP;
}

function validateSamplePoints(points: SamplePointInput[]): void {
  if (points.length !== REQUIRED_SAMPLE_POINTS.length) {
    throw new ScoringError(
      "SAMPLE_POINT_COUNT_INVALID",
      `Batch wajib punya tepat ${REQUIRED_SAMPLE_POINTS.length} titik sampel, ditemukan ${points.length}.`,
    );
  }

  for (const required of REQUIRED_SAMPLE_POINTS) {
    const matches = points.filter((p) => p.point === required);
    if (matches.length !== 1) {
      throw new ScoringError(
        "SAMPLE_POINT_COUNT_INVALID",
        `Titik sampel "${required}" wajib ada tepat 1, ditemukan ${matches.length}.`,
      );
    }
  }

  for (const point of points) {
    if (![1, 2, 3].includes(point.odorLevel)) {
      throw new ScoringError(
        "ODOR_LEVEL_INVALID",
        `Level bau titik "${point.point}" tidak valid: ${point.odorLevel}.`,
      );
    }
  }
}

function readRawScore(point: SamplePointInput, sub: SubCriterionConfig): number {
  const raw = point.scores[sub.subKey];
  if (raw === undefined || raw === null) {
    throw new ScoringError(
      "SUB_SCORE_MISSING",
      `Skor sub-kriteria "${sub.subKey}" belum diisi di titik "${point.point}".`,
    );
  }
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
    throw new ScoringError(
      "SUB_SCORE_OUT_OF_RANGE",
      `Skor "${sub.subKey}" di titik "${point.point}" harus 0-100, diterima ${raw}.`,
    );
  }
  return raw;
}

function weightedAverage(
  point: SamplePointInput,
  subs: SubCriterionConfig[],
): { score: number; contributions: SubContribution[] } {
  const contributions: SubContribution[] = subs.map((sub) => {
    const rawScore = readRawScore(point, sub);
    return {
      criterion: sub.criterion,
      subKey: sub.subKey,
      label: sub.label,
      rawScore,
      weightPct: sub.weightPct,
      contribution: (rawScore * sub.weightPct) / 100,
      ignoredByOverride: false,
    };
  });

  const score = contributions.reduce((acc, c) => acc + c.contribution, 0);
  return { score, contributions };
}

/**
 * Menghitung skor kemurnian & kebersihan untuk SATU titik sampel.
 *
 * Override bau diterapkan di sini — per titik, sebelum rata-rata antar titik.
 * Override BUKAN batas atas: saat level 3, seluruh sub-kriteria kebersihan lain
 * diabaikan sepenuhnya dan skor kebersihan titik ini ditetapkan sama dengan cap.
 */
export function computeSamplePoint(
  category: CategoryConfig,
  point: SamplePointInput,
): SamplePointBreakdown {
  const purity = weightedAverage(point, subsOf(category, "purity"));
  const cleanlinessSubs = subsOf(category, "cleanliness");
  const cleanliness = weightedAverage(point, cleanlinessSubs);

  const overridden = point.odorLevel === ODOR_OVERRIDE_LEVEL;
  const cap = odorOverrideCapOf(category);

  const cleanlinessContributions = cleanliness.contributions.map((c) => ({
    ...c,
    contribution: overridden ? 0 : c.contribution,
    ignoredByOverride: overridden,
  }));

  return {
    point: point.point,
    odorLevel: point.odorLevel,
    purity: purity.score,
    cleanliness: overridden ? cap : cleanliness.score,
    cleanlinessOverridden: overridden,
    cleanlinessOverrideCap: overridden ? cap : null,
    contributions: [...purity.contributions, ...cleanlinessContributions],
  };
}

function mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function worseLevel(a: ConsistencyLevel, b: ConsistencyLevel): ConsistencyLevel {
  return CONSISTENCY_SEVERITY[a] >= CONSISTENCY_SEVERITY[b] ? a : b;
}

/**
 * Konsistensi batch: DIHITUNG dari sebaran antar titik, bukan dinilai grader.
 *
 * Bila kemurnian dan kebersihan menghasilkan level berbeda, ambil yang lebih
 * parah. Konservatif secara sengaja (SRD Bab 7.5) — satu dimensi yang sangat
 * tidak konsisten sudah cukup jadi red flag.
 */
export function computeConsistency(points: SamplePointBreakdown[]): ConsistencyBreakdown {
  const puritySpread = spread(points.map((p) => p.purity));
  const cleanlinessSpread = spread(points.map((p) => p.cleanliness));

  const purityLevel = consistencyLevelFromSpread(puritySpread);
  const cleanlinessLevel = consistencyLevelFromSpread(cleanlinessSpread);
  const appliedLevel = worseLevel(purityLevel, cleanlinessLevel);

  return {
    puritySpread,
    cleanlinessSpread,
    purityLevel,
    cleanlinessLevel,
    appliedLevel,
    score: CONSISTENCY_SCORES[appliedLevel],
  };
}

/** Akurasi kuantitas & spesifikasi (SRD Bab 7.6). Bobot berat/spesifikasi per kategori. */
export function computeQuantity(
  category: CategoryConfig,
  input: QuantityInput,
): QuantityBreakdown {
  if (!Number.isFinite(input.claimedWeightKg) || input.claimedWeightKg <= 0) {
    throw new ScoringError(
      "CLAIMED_WEIGHT_INVALID",
      `Klaim berat harus > 0, diterima ${input.claimedWeightKg}.`,
    );
  }
  if (!Number.isFinite(input.actualWeightKg) || input.actualWeightKg < 0) {
    throw new ScoringError(
      "ACTUAL_WEIGHT_INVALID",
      `Berat timbang ulang harus >= 0, diterima ${input.actualWeightKg}.`,
    );
  }
  if (!Number.isFinite(input.specMatchPct) || input.specMatchPct < 0 || input.specMatchPct > 100) {
    throw new ScoringError(
      "SPEC_MATCH_OUT_OF_RANGE",
      `Persentase kesesuaian spesifikasi harus 0-100, diterima ${input.specMatchPct}.`,
    );
  }

  const subs = subsOf(category, "quantity_accuracy");

  // Bobot dicari lewat sub_key, bukan urutan baris atau teks label.
  const unknown = subs.find(
    (s) => s.subKey !== WEIGHT_ACCURACY_SUB_KEY && s.subKey !== SPEC_ACCURACY_SUB_KEY,
  );
  if (unknown) {
    throw new ScoringError(
      "QUANTITY_SUB_KEY_UNKNOWN",
      `sub_key "${unknown.subKey}" tidak dikenal pada quantity_accuracy; wajib "${WEIGHT_ACCURACY_SUB_KEY}" atau "${SPEC_ACCURACY_SUB_KEY}".`,
    );
  }

  const weightWeightPct = subs
    .filter((s) => s.subKey === WEIGHT_ACCURACY_SUB_KEY)
    .reduce((acc, s) => acc + s.weightPct, 0);
  // Minyak Jelantah tidak punya spec_accuracy — hasilnya 0, bukan error.
  const specWeightPct = subs
    .filter((s) => s.subKey === SPEC_ACCURACY_SUB_KEY)
    .reduce((acc, s) => acc + s.weightPct, 0);

  const deviationPct =
    (Math.abs(input.claimedWeightKg - input.actualWeightKg) / input.claimedWeightKg) * 100;
  const weightScore = weightAccuracyScore(deviationPct);
  const specScore = specAccuracyScore(input.specMatchPct);

  return {
    deviationPct,
    weightScore,
    specScore,
    weightWeightPct,
    specWeightPct,
    score: (weightScore * weightWeightPct + specScore * specWeightPct) / 100,
  };
}

/** Kelengkapan dokumentasi: 4 item × 25 poin (SRD Bab 7.6). */
export function computeDocumentation(input: DocumentationInput): DocumentationBreakdown {
  const items = DOCUMENTATION_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    points: input[item.key] ? item.points : 0,
  }));

  return {
    items,
    score: items.reduce((acc, item) => acc + item.points, 0),
  };
}

/**
 * Menghitung satu batch dari nol sampai grade.
 *
 * Catatan presisi (SRD Bab 7.7): seluruh perhitungan internal float penuh.
 * Pembulatan hanya di dua tempat — `finalScore` (bilangan bulat, dasar grade)
 * dan saat tampil di UI.
 */
export function computeGrading(input: GradingInput): GradingResult {
  validateCategoryConfig(input.category);
  validateSamplePoints(input.samplePoints);

  const ordered = REQUIRED_SAMPLE_POINTS.map(
    (name) => input.samplePoints.find((p) => p.point === name) as SamplePointInput,
  );
  const samplePoints = ordered.map((point) => computeSamplePoint(input.category, point));

  const purityScore = mean(samplePoints.map((p) => p.purity));
  const cleanlinessScore = mean(samplePoints.map((p) => p.cleanliness));
  const consistency = computeConsistency(samplePoints);
  const quantity = computeQuantity(input.category, input.quantity);
  const documentation = computeDocumentation(input.documentation);

  const final: FinalCriterionRow[] = [
    {
      key: "purity",
      label: "Kemurnian/Komposisi",
      score: purityScore,
      weightPct: FINAL_WEIGHTS.purity,
      contribution: (purityScore * FINAL_WEIGHTS.purity) / 100,
    },
    {
      key: "cleanliness",
      label: "Kebersihan & Kontaminasi",
      score: cleanlinessScore,
      weightPct: FINAL_WEIGHTS.cleanliness,
      contribution: (cleanlinessScore * FINAL_WEIGHTS.cleanliness) / 100,
    },
    {
      key: "consistency",
      label: "Konsistensi Batch",
      score: consistency.score,
      weightPct: FINAL_WEIGHTS.consistency,
      contribution: (consistency.score * FINAL_WEIGHTS.consistency) / 100,
    },
    {
      key: "quantity",
      label: "Akurasi Kuantitas & Spesifikasi",
      score: quantity.score,
      weightPct: FINAL_WEIGHTS.quantity,
      contribution: (quantity.score * FINAL_WEIGHTS.quantity) / 100,
    },
    {
      key: "documentation",
      label: "Kelengkapan Dokumentasi",
      score: documentation.score,
      weightPct: FINAL_WEIGHTS.documentation,
      contribution: (documentation.score * FINAL_WEIGHTS.documentation) / 100,
    },
  ];

  const finalScoreRaw = final.reduce((acc, row) => acc + row.contribution, 0);
  const finalScore = Math.round(finalScoreRaw);

  return {
    purityScore,
    cleanlinessScore,
    consistencyScore: consistency.score,
    quantityScore: quantity.score,
    documentationScore: documentation.score,
    finalScoreRaw,
    finalScore,
    grade: gradeFromFinalScore(finalScore),
    scoringVersion: SCORING_VERSION,
    breakdown: { samplePoints, consistency, quantity, documentation, final },
  };
}

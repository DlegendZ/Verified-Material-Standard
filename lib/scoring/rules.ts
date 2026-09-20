/**
 * Konstanta & tabel aturan scoring VMS.
 *
 * Sumber kebenaran domain: grading-system.md Section 2-9, SRD Bab 7.
 * Semua angka di sini sengaja dikumpulkan di satu tempat agar mudah diaudit.
 */
import type { ConsistencyLevel, Criterion, DocumentationInput, Grade } from "./types";

/**
 * Versi rumus. WAJIB dinaikkan setiap kali angka/aturan di file ini berubah,
 * karena nilai ini ikut disimpan di `grading_results.scoring_version` supaya
 * sertifikat lama tidak pernah berubah artinya.
 */
export const SCORING_VERSION = "1.0.0";

/** Bobot akhir tiap kriteria (SRD Bab 7.1). Totalnya 100. */
export const FINAL_WEIGHTS = {
  purity: 30,
  cleanliness: 25,
  consistency: 20,
  quantity: 15,
  documentation: 10,
} as const;

/** Cap kebersihan default saat bau level 3 (grading-system.md Section 4.2). */
export const DEFAULT_ODOR_OVERRIDE_CAP = 40;

/** Level bau yang memicu override. */
export const ODOR_OVERRIDE_LEVEL = 3;

/** Urutan titik sampel yang wajib ada — tepat tiga, tidak boleh kurang/lebih. */
export const REQUIRED_SAMPLE_POINTS = ["top", "middle", "bottom"] as const;

/**
 * KONVENSI sub_key WAJIB (SRD v1.1 Bab 5.1 & 7.6).
 *
 * Di dalam kriteria quantity_accuracy, engine membedakan sub-kriteria berat dan
 * spesifikasi HANYA lewat sub_key ini — bukan lewat urutan baris atau isi label.
 * Kategori Minyak Jelantah hanya punya baris weight_accuracy (bobot 100), dan
 * ketiadaan spec_accuracy bukan error.
 */
export const WEIGHT_ACCURACY_SUB_KEY = "weight_accuracy";
export const SPEC_ACCURACY_SUB_KEY = "spec_accuracy";

/** Skor tetap per level konsistensi (SRD Bab 7.5). */
export const CONSISTENCY_SCORES: Record<ConsistencyLevel, number> = {
  small: 95,
  medium: 70,
  large: 40,
};

/** Urutan keparahan; dipakai untuk mengambil level terparah. */
export const CONSISTENCY_SEVERITY: Record<ConsistencyLevel, number> = {
  small: 0,
  medium: 1,
  large: 2,
};

/**
 * Sebaran (max − min antar 3 titik) → level konsistensi.
 * ≤10 kecil, >10 sampai ≤30 sedang, >30 besar.
 */
export function consistencyLevelFromSpread(spread: number): ConsistencyLevel {
  if (spread <= 10) return "small";
  if (spread <= 30) return "medium";
  return "large";
}

/**
 * Tabel deviasi berat (SRD Bab 7.6).
 * Batas bersifat inklusif di sisi atas: tepat 2% → 100, tepat 5% → 80, tepat 10% → 50.
 */
export function weightAccuracyScore(deviationPct: number): number {
  if (deviationPct <= 2) return 100;
  if (deviationPct <= 5) return 80;
  if (deviationPct <= 10) return 50;
  return 0;
}

/**
 * Tabel akurasi spesifikasi (SRD Bab 7.6).
 * ≥90 → 100, 75-89 → 75, 50-74 → 50, <50 → 20.
 */
export function specAccuracyScore(specMatchPct: number): number {
  if (specMatchPct >= 90) return 100;
  if (specMatchPct >= 75) return 75;
  if (specMatchPct >= 50) return 50;
  return 20;
}

/** Empat item dokumentasi, masing-masing 25 poin (SRD Bab 7.6). */
export const DOCUMENTATION_ITEMS: {
  key: keyof DocumentationInput;
  label: string;
  points: number;
}[] = [
  { key: "hasProductionDate", label: "Tanggal produksi tercantum", points: 25 },
  { key: "hasMultiAnglePhotos", label: "Foto batch multi-sudut", points: 25 },
  { key: "hasLotNumber", label: "Nomor lot/traceability", points: 25 },
  { key: "hasLabTest", label: "Hasil uji tambahan (mis. uji lab)", points: 25 },
];

/** Ambang grade, dievaluasi terhadap skor akhir yang SUDAH dibulatkan. */
export function gradeFromFinalScore(roundedFinalScore: number): Grade {
  if (roundedFinalScore >= 85) return "A";
  if (roundedFinalScore >= 70) return "B";
  if (roundedFinalScore >= 55) return "C";
  return "D";
}

/** Label singkat grade untuk UI & sertifikat. */
export const GRADE_LABELS: Record<Grade, string> = {
  A: "Premium",
  B: "Standard",
  C: "Ekonomis",
  D: "Tidak lolos sertifikasi",
};

/** Grade yang boleh diterbitkan sertifikatnya (SRD Bab 9.1). */
export const CERTIFIABLE_GRADES: Grade[] = ["A", "B", "C"];

/** Label kriteria untuk tampilan. */
export const CRITERION_LABELS: Record<Criterion, string> = {
  purity: "Kemurnian/Komposisi",
  cleanliness: "Kebersihan & Kontaminasi",
  quantity_accuracy: "Akurasi Kuantitas & Spesifikasi",
};

/** Toleransi float saat memeriksa jumlah bobot = 100. */
export const WEIGHT_SUM_EPSILON = 1e-6;

/**
 * Tipe data untuk scoring engine VMS.
 *
 * Modul ini murni tipe — tidak boleh mengimpor apa pun dari Supabase,
 * Next.js, atau lapisan I/O lain. Lihat SRD Bab 4.3.
 */

/** Tiga kriteria yang sub-kriterianya dikonfigurasi per kategori material. */
export type Criterion = "purity" | "cleanliness" | "quantity_accuracy";

/** Titik sampel dalam satu batch (SRD Bab 6.3 Langkah 2). */
export type SamplePointName = "top" | "middle" | "bottom";

/** Skala bau 3 level; level 3 memicu override kebersihan. */
export type OdorLevel = 1 | 2 | 3;

/** Grade huruf hasil akhir. */
export type Grade = "A" | "B" | "C" | "D";

/** Level sebaran antar titik yang dipakai untuk skor konsistensi. */
export type ConsistencyLevel = "small" | "medium" | "large";

/**
 * Satu baris konfigurasi sub-kriteria — cerminan tabel `category_criteria`.
 * `weightPct` adalah bobot DI DALAM kriterianya dan wajib berjumlah 100
 * per kriteria per kategori.
 */
export interface SubCriterionConfig {
  criterion: Criterion;
  subKey: string;
  label: string;
  weightPct: number;
  isOdor: boolean;
  /** Hanya relevan bila `isOdor`; null berarti pakai cap default 40. */
  odorOverrideCap: number | null;
}

/** Konfigurasi lengkap satu kategori material. */
export interface CategoryConfig {
  code: string;
  name: string;
  criteria: SubCriterionConfig[];
}

/** Input grader untuk satu titik sampel. */
export interface SamplePointInput {
  point: SamplePointName;
  odorLevel: OdorLevel;
  /** subKey → skor mentah 0-100, mencakup sub-kriteria purity & cleanliness. */
  scores: Record<string, number>;
}

/** Input Langkah 3 grader: akurasi kuantitas & spesifikasi. */
export interface QuantityInput {
  claimedWeightKg: number;
  actualWeightKg: number;
  /** Persentase sampel yang sesuai spesifikasi klaim, 0-100. */
  specMatchPct: number;
}

/** Input Langkah 4 grader: 4 item dokumentasi, masing-masing 25 poin. */
export interface DocumentationInput {
  hasProductionDate: boolean;
  hasMultiAnglePhotos: boolean;
  hasLotNumber: boolean;
  hasLabTest: boolean;
}

/** Seluruh input yang dibutuhkan engine untuk menghitung satu batch. */
export interface GradingInput {
  category: CategoryConfig;
  samplePoints: SamplePointInput[];
  quantity: QuantityInput;
  documentation: DocumentationInput;
}

/** Rincian perhitungan satu titik sampel. */
export interface SamplePointBreakdown {
  point: SamplePointName;
  odorLevel: OdorLevel;
  purity: number;
  cleanliness: number;
  /** true bila kebersihan titik ini ditetapkan lewat override bau level 3. */
  cleanlinessOverridden: boolean;
  /** Nilai cap yang dipakai saat override; null bila tidak ada override. */
  cleanlinessOverrideCap: number | null;
  /** Kontribusi tiap sub-kriteria, untuk ditampilkan di UI & audit. */
  contributions: SubContribution[];
}

export interface SubContribution {
  criterion: Criterion;
  subKey: string;
  label: string;
  rawScore: number;
  weightPct: number;
  /** rawScore × weightPct / 100; 0 bila diabaikan karena override. */
  contribution: number;
  /** true bila nilai mentah disimpan tapi tidak ikut dihitung. */
  ignoredByOverride: boolean;
}

export interface ConsistencyBreakdown {
  puritySpread: number;
  cleanlinessSpread: number;
  purityLevel: ConsistencyLevel;
  cleanlinessLevel: ConsistencyLevel;
  /** Level terparah di antara keduanya — itu yang dipakai. */
  appliedLevel: ConsistencyLevel;
  score: number;
}

export interface QuantityBreakdown {
  deviationPct: number;
  weightScore: number;
  specScore: number;
  weightWeightPct: number;
  specWeightPct: number;
  score: number;
}

export interface DocumentationBreakdown {
  items: { key: keyof DocumentationInput; label: string; points: number }[];
  score: number;
}

/** Satu baris pada tabel kontribusi skor akhir. */
export interface FinalCriterionRow {
  key: "purity" | "cleanliness" | "consistency" | "quantity" | "documentation";
  label: string;
  score: number;
  weightPct: number;
  contribution: number;
}

/** Hasil lengkap — inilah yang disimpan ke `grading_results.breakdown_json`. */
export interface GradingResult {
  purityScore: number;
  cleanlinessScore: number;
  consistencyScore: number;
  quantityScore: number;
  documentationScore: number;
  /** Skor akhir presisi penuh (float). */
  finalScoreRaw: number;
  /** Skor akhir dibulatkan ke bilangan bulat — dasar penentuan grade. */
  finalScore: number;
  grade: Grade;
  scoringVersion: string;
  breakdown: {
    samplePoints: SamplePointBreakdown[];
    consistency: ConsistencyBreakdown;
    quantity: QuantityBreakdown;
    documentation: DocumentationBreakdown;
    final: FinalCriterionRow[];
  };
}

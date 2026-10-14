/** Sumber seed dan fixture. Runtime selalu membaca konfigurasi dari database. */
import type {
  CategoryConfig,
  SubCriterionConfig,
  Grade,
  ClaimMode,
} from "./scoring/types";
export type CategoryStatus = "live" | "coming_soon";
export interface SeedFormProfile {
  code: string;
  name: string;
  description: string;
  pointDefinition: string;
  unitLabel: string;
  unitsPerPoint: number;
  samplingNotes: string;
  claimMode: ClaimMode;
  sortOrder: number;
}
export interface SeedCategory extends CategoryConfig {
  status: CategoryStatus;
  isActive: boolean;
  notes: string;
  sortOrder: number;
  shortDescription: string;
  certificateValidityDays: number | null;
  gradeMeanings: Record<Grade, string> | null;
  odorLevel3Hint: string | null;
  nonB3Extra: string | null;
  claimBoundary: string | null;
  thresholdDisclaimer: string | null;
  profiles: SeedFormProfile[];
}
const sub = (
  criterion: SubCriterionConfig["criterion"],
  subKey: string,
  label: string,
  weightPct: number,
  extra: Partial<SubCriterionConfig> = {},
): SubCriterionConfig => ({
  criterion,
  subKey,
  label,
  weightPct,
  isOdor: false,
  odorOverrideCap: null,
  scoringMethod: "scale",
  requiresMeasurementMethod: false,
  helpText: null,
  ...extra,
});
const roadmap = {
  isActive: true,
  status: "coming_soon" as const,
  certificateValidityDays: null,
  gradeMeanings: null,
  odorLevel3Hint: null,
  nonB3Extra: null,
  claimBoundary: null,
  thresholdDisclaimer: null,
  profiles: [],
};
export const LEGACY_CATEGORY_CODES = [
  "textile",
  "plastic",
  "paper",
  "biomass",
  "uco",
] as const;
export const SEED_CATEGORIES: SeedCategory[] = [
  {
    code: "solid_wood",
    name: "Kayu Solid",
    status: "live",
    isActive: true,
    sortOrder: 1,
    shortDescription:
      "Pilot — sisa produksi kayu solid dari pabrik atau bengkel: batang berikat atau potongan pendek lepas.",
    certificateValidityDays: 42,
    gradeMeanings: {
      A: "Unit relatif utuh, hampir tanpa kerusakan biologis/kontaminan, konsisten. Cocok pemakaian ulang bernilai lebih tinggi (mis. bahan kerajinan/furnitur kecil).",
      B: "Layak pakai ulang dengan penyortiran ringan (buang unit cacat, cabut paku).",
      C: "Banyak penyortiran atau bagian terpakai kecil; cenderung untuk pemakaian bernilai lebih rendah.",
      D: "Tidak lolos sertifikasi; disarankan disortir/diproses ulang.",
    },
    odorLevel3Hint:
      'Bau jamur atau busuk yang menyengat. Bau bahan kimia (pengawet, pelarut, cat) bukan dinilai di sini — hentikan penilaian dan pakai tombol "Tolak batch — temuan Non-B3".',
    nonB3Extra:
      "Kayu yang diawetkan kimia atau terkontaminasi cat, lem, pernis, pelarut, atau oli tidak diterima di pilot sampai status hukumnya diverifikasi (kebijakan konservatif tim, bukan klaim hukum). Sisa sekecil apa pun pada satu unit = gagal. Ragu soal status B3 → tolak dulu.",
    claimBoundary:
      "Grade VMS menilai kondisi material dan kesesuaian klaim, bukan uji kekuatan struktural.",
    thresholdDisclaimer:
      "Ambang penilaian cacat kayu dan toleransi dimensi masih draft awal dan belum divalidasi ahli perkayuan.",
    notes:
      "Kategori pilot. Bobot draft kurasi, belum divalidasi Domain Expert (grading-system §11).",
    criteria: [
      sub("purity", "species_match", "Jenis kayu sesuai deklarasi", 70, {
        helpText:
          "Cocokkan dengan sampel acuan dan dokumen asal bahan baku. Identifikasi visual tidak 100% pasti.",
      }),
      sub(
        "purity",
        "uniformity",
        "Keseragaman jenis & ukuran dalam 1 titik sampel",
        30,
        {
          helpText:
            "Dalam satu titik, apakah jenis, warna, dan ukurannya seragam atau campur.",
        },
      ),
      sub(
        "cleanliness",
        "biological_damage",
        "Kerusakan biologis (lapuk, jamur/biru, rayap/bubuk)",
        30,
        {
          scoringMethod: "unit_count",
          helpText:
            "Unit tidak lolos bila: lapuk, jamur/biru, lubang atau serbuk bekas rayap.",
        },
      ),
      sub(
        "cleanliness",
        "foreign_contaminant",
        "Kontaminan benda asing (paku/sekrup tertanam)",
        25,
        {
          scoringMethod: "unit_count",
          helpText:
            "Unit tidak lolos bila ada paku, sekrup, atau logam lain yang tertanam. Sisa cat, lem, pernis, pelarut, atau oli tidak dinilai di sini: batch seperti itu ditolak lewat gerbang Non-B3.",
        },
      ),
      sub("cleanliness", "moisture", "Kadar kelembapan", 15, {
        requiresMeasurementMethod: true,
        helpText:
          "Pakai moisture meter bila ada; bila tidak, estimasi sentuh. Metode wajib dicatat.",
      }),
      sub(
        "cleanliness",
        "physical_defect",
        "Cacat fisik (retak/pecah, bengkok, mata kayu lepas)",
        10,
        {
          scoringMethod: "unit_count",
          helpText:
            "Unit tidak lolos bila: retak/pecah, bengkok/melintir, mata kayu lepas atau besar, kulit/tepi tidak rata.",
        },
      ),
      sub("cleanliness", "odor", "Bau", 20, {
        isOdor: true,
        odorOverrideCap: 40,
        helpText:
          "Level 3 (parah) memicu override: skor kebersihan titik = 40, sub-kriteria lain diabaikan.",
      }),
      sub(
        "quantity_accuracy",
        "weight_accuracy",
        "Akurasi kuantitas (berat; plus isi per ikat untuk klaim per ikat)",
        60,
        {
          helpText:
            "Timbang ulang; untuk klaim per ikat, hitung juga isi ikat sampel. Dipakai selisih terbesar.",
        },
      ),
      sub(
        "quantity_accuracy",
        "spec_accuracy",
        "Akurasi dimensi (penampang & panjang) vs klaim",
        40,
        {
          helpText:
            "Persentase unit sampel yang dimensinya dalam toleransi klaim.",
        },
      ),
    ],
    profiles: [
      {
        code: "bundled_sticks",
        name: "Batang berikat",
        description: "Batang kayu sisa produksi yang diikat per ikat.",
        pointDefinition: "1 ikat dari lapisan atas, tengah, dan dasar tumpukan",
        unitLabel: "batang",
        unitsPerPoint: 10,
        samplingNotes:
          "Ikat wajib dibuka. Jangan menilai dari sisi luar saja, karena bagian dalam ikat tidak kelihatan. Hitung juga jumlah batang di setiap ikat sampel.",
        claimMode: "bundle",
        sortOrder: 1,
      },
      {
        code: "loose_offcuts",
        name: "Potongan pendek lepas",
        description: "Potongan pendek kayu solid yang tidak diikat.",
        pointDefinition:
          "Segenggam dari lapisan atas, tengah, dan dasar tumpukan",
        unitLabel: "potongan",
        unitsPerPoint: 20,
        samplingNotes:
          "Ambil dari bagian dalam tumpukan, bukan hanya permukaan.",
        claimMode: "weight",
        sortOrder: 2,
      },
    ],
  },
  {
    ...roadmap,
    code: "metal",
    name: "Besi & Logam",
    sortOrder: 2,
    shortDescription: "Roadmap — kriteria masih draft, belum bisa diajukan.",
    odorLevel3Hint: "Indikasi kontaminasi kimia/oli/bahan berbahaya.",
    notes:
      "Roadmap. Bobot diwarisi draft lama, belum divalidasi. Profil bentuk belum dirancang.",
    criteria: [
      sub(
        "purity",
        "metal_type_match",
        "Jenis logam sesuai deklarasi (ferrous/non-ferrous — uji magnet)",
        70,
      ),
      sub("purity", "uniformity", "Keseragaman jenis dalam batch", 30),
      sub("cleanliness", "rust_level", "Tingkat karat/oksidasi", 50),
      sub(
        "cleanliness",
        "non_metal_contaminant",
        "Kontaminan non-logam (plastik/karet menempel)",
        30,
      ),
      sub("cleanliness", "odor", "Bau (indikasi oli/kimia berbahaya)", 20, {
        isOdor: true,
        odorOverrideCap: 40,
      }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 60),
      sub(
        "quantity_accuracy",
        "spec_accuracy",
        "Akurasi bentuk scrap (utuh/potongan sesuai klaim)",
        40,
      ),
    ],
  },
  {
    ...roadmap,
    code: "glass",
    name: "Kaca",
    sortOrder: 3,
    shortDescription:
      "Roadmap — kriteria belum dirancang, belum bisa diajukan.",
    notes:
      "Roadmap. Sub-kriteria & bobot sengaja belum diisi sampai divalidasi. Keselamatan sampling (APD, SOP) belum dirancang.",
    criteria: [],
  },
  {
    ...roadmap,
    code: "ceramic",
    name: "Keramik",
    sortOrder: 4,
    shortDescription:
      "Roadmap — kriteria belum dirancang, belum bisa diajukan.",
    notes:
      "Roadmap. Sumber dibatasi afkir ubin & pecahan padat. Pemetaan grade pabrik KW1–3 vs grade VMS belum dirancang.",
    criteria: [],
  },
];
export function findSeedCategory(code: string): SeedCategory {
  const category = SEED_CATEGORIES.find((c) => c.code === code);
  if (!category) throw new Error(`Kategori seed tidak ditemukan: ${code}`);
  return category;
}

/**
 * Konfigurasi kategori material — SUMBER SEED, bukan sumber runtime.
 *
 * Saat aplikasi berjalan, bobot dibaca dari tabel `material_categories` +
 * `category_criteria` (SRD Bab 4.3: "konfigurasi kategori adalah data"), karena
 * Admin boleh mengubahnya dari UI. File ini dipakai untuk:
 *  - mengisi supabase/seed.sql
 *  - fixture unit test scoring engine
 *
 * Isi tabel mengikuti SRD Bab 8. Catatan jujur dari dokumen domain: kategori
 * selain Tekstil memakai pola bobot yang sama dan BELUM divalidasi Domain Expert.
 */
import type { CategoryConfig, SubCriterionConfig } from "./scoring/types";

export type CategoryStatus = "live" | "coming_soon";

export interface SeedCategory extends CategoryConfig {
  status: CategoryStatus;
  isActive: boolean;
  notes: string;
}

function sub(
  criterion: SubCriterionConfig["criterion"],
  subKey: string,
  label: string,
  weightPct: number,
  extra?: { isOdor?: boolean; odorOverrideCap?: number | null },
): SubCriterionConfig {
  return {
    criterion,
    subKey,
    label,
    weightPct,
    isOdor: extra?.isOdor ?? false,
    odorOverrideCap: extra?.odorOverrideCap ?? null,
  };
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    code: "textile",
    name: "Tekstil",
    status: "live",
    isActive: true,
    notes: "Kategori pilot. Bobot sudah dipakai sebagai contoh di grading-system.md Section 10.",
    criteria: [
      sub("purity", "fiber_type_match", "Jenis serat sesuai deklarasi", 70),
      sub("purity", "uniformity", "Keseragaman warna/jenis dalam 1 titik", 30),
      sub("cleanliness", "dirt_level", "Tingkat kotoran/noda", 50),
      sub("cleanliness", "fraying_level", "Tingkat fraying (serat lepas)", 30),
      sub("cleanliness", "odor", "Bau", 20, { isOdor: true, odorOverrideCap: 40 }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 60),
      sub("quantity_accuracy", "spec_accuracy", "Akurasi ukuran potongan vs klaim", 40),
    ],
  },
  {
    code: "metal",
    name: "Logam & Besi",
    status: "live",
    isActive: true,
    notes: "Belum divalidasi Domain Expert (sesi Week 7).",
    criteria: [
      sub("purity", "metal_type_match", "Jenis logam sesuai deklarasi (uji magnet ferrous/non-ferrous)", 70),
      sub("purity", "uniformity", "Keseragaman jenis dalam batch", 30),
      sub("cleanliness", "rust_level", "Tingkat karat/oksidasi", 50),
      sub("cleanliness", "non_metal_contaminant", "Kontaminan non-logam (plastik/karet menempel)", 30),
      sub("cleanliness", "odor", "Bau (indikasi oli/kimia berbahaya)", 20, {
        isOdor: true,
        odorOverrideCap: 40,
      }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 60),
      sub("quantity_accuracy", "spec_accuracy", "Akurasi bentuk scrap vs klaim", 40),
    ],
  },
  {
    code: "plastic",
    name: "Plastik Daur Ulang",
    status: "live",
    isActive: true,
    notes: "Belum divalidasi Domain Expert (sesi Week 7).",
    criteria: [
      sub("purity", "resin_type_match", "Jenis resin sesuai deklarasi (kode 1-7)", 70),
      sub("purity", "uniformity", "Keseragaman warna/jenis", 30),
      sub("cleanliness", "contaminant", "Kontaminan (label/lem/tutup beda material)", 50),
      sub("cleanliness", "dirt_level", "Tingkat kotoran fisik (debu, sisa cairan)", 30),
      sub("cleanliness", "odor", "Bau (indikasi sisa kimia berbahaya)", 20, {
        isOdor: true,
        odorOverrideCap: 40,
      }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 60),
      sub("quantity_accuracy", "spec_accuracy", "Akurasi bentuk (utuh/pecahan/pellet) vs klaim", 40),
    ],
  },
  {
    code: "paper",
    name: "Kertas & Kardus",
    status: "live",
    isActive: true,
    notes: "Belum divalidasi Domain Expert (sesi Week 7).",
    criteria: [
      sub("purity", "paper_type_match", "Jenis kertas sesuai deklarasi (OCC/HVS/koran)", 70),
      sub("purity", "uniformity", "Keseragaman jenis dalam batch", 30),
      sub("cleanliness", "contaminant", "Kontaminan (staples, lakban, klip)", 40),
      sub("cleanliness", "moisture_level", "Kadar kelembaban", 40),
      sub("cleanliness", "odor", "Bau (indikasi jamur/busuk)", 20, {
        isOdor: true,
        odorOverrideCap: 40,
      }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 70),
      sub("quantity_accuracy", "spec_accuracy", "Akurasi spesifikasi (laminasi) vs klaim", 30),
    ],
  },
  {
    code: "biomass",
    name: "Biomassa / Organik",
    status: "live",
    isActive: true,
    notes: "Belum divalidasi Domain Expert (sesi Week 7).",
    criteria: [
      sub("purity", "moisture_threshold", "Kadar air sesuai ambang", 60),
      sub("purity", "particle_uniformity", "Keseragaman ukuran partikel", 40),
      sub("cleanliness", "non_organic_contaminant", "Kontaminan non-organik (plastik, batu, kerikil)", 50),
      sub("cleanliness", "rot_signs", "Tanda pembusukan/jamur (visual)", 30),
      sub("cleanliness", "odor", "Bau busuk", 20, { isOdor: true, odorOverrideCap: 40 }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi berat", 70),
      sub("quantity_accuracy", "spec_accuracy", "Akurasi ukuran partikel vs klaim", 30),
    ],
  },
  {
    code: "uco",
    name: "Minyak Jelantah (UCO)",
    status: "coming_soon",
    isActive: true,
    notes:
      "Feasibility rendah: kadar air butuh alat lab. Tampil di UI sebagai Segera Hadir, tidak bisa dipilih saat submit batch. Cap override bau 20 (lebih ketat dari default 40).",
    criteria: [
      sub("purity", "color_clarity", "Kejernihan warna (indikasi frekuensi pemakaian)", 60),
      sub("purity", "water_content", "Kadar air (butuh alat lab — limitation MVP)", 40),
      sub("cleanliness", "solid_contaminant", "Kontaminan padatan (sisa makanan/kerak)", 60),
      sub("cleanliness", "odor", "Bau tengik ekstrem", 40, { isOdor: true, odorOverrideCap: 20 }),
      sub("quantity_accuracy", "weight_accuracy", "Akurasi volume/berat", 100),
    ],
  },
];

export function findSeedCategory(code: string): SeedCategory {
  const category = SEED_CATEGORIES.find((c) => c.code === code);
  if (!category) throw new Error(`Kategori seed "${code}" tidak ditemukan.`);
  return category;
}

import { z } from "zod";

/**
 * Skema Zod dipakai BERSAMA client dan server — satu sumber kebenaran
 * (SRD Bab 4.1). Pesan error ditulis dalam bahasa Indonesia karena langsung
 * tampil di form.
 */

const scoreField = z
  .number({ message: "Skor wajib diisi" })
  .min(0, "Skor minimal 0")
  .max(100, "Skor maksimal 100");

export const signInSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z.string().min(3, "Nama minimal 3 karakter").max(120),
  email: z.email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  phone: z
    .string()
    .min(8, "Nomor telepon minimal 8 digit")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Nomor telepon hanya boleh angka, +, dan -"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const factoryProfileSchema = z.object({
  legalName: z.string().min(3, "Nama badan usaha minimal 3 karakter").max(160),
  address: z.string().min(5, "Alamat minimal 5 karakter").max(400),
  city: z.string().min(2, "Kota wajib diisi").max(80),
  contactPerson: z.string().min(3, "Nama kontak minimal 3 karakter").max(120),
  contactPhone: z
    .string()
    .min(8, "Nomor telepon minimal 8 digit")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Nomor telepon hanya boleh angka, +, dan -"),
});
export type FactoryProfileInput = z.infer<typeof factoryProfileSchema>;

export const batchDraftSchema = z.object({
  categoryId: z.uuid("Kategori material wajib dipilih"),
  claimedWeightKg: z
    .number({ message: "Klaim berat wajib diisi" })
    .positive("Klaim berat harus lebih dari 0")
    .max(1_000_000, "Klaim berat tidak masuk akal"),
  claimedSpec: z.string().max(400).optional().or(z.literal("")),
  productionDate: z.string().optional().or(z.literal("")),
  lotNumber: z.string().max(80).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
});
export type BatchDraftInput = z.infer<typeof batchDraftSchema>;

/** Tiga gerbang wajib. Bila ada yang gagal, catatan wajib diisi (SRD Bab 6.3). */
export const gateCheckSchema = z
  .object({
    nonB3Pass: z.boolean(),
    originExistsPass: z.boolean(),
    originAuthenticPass: z.boolean(),
    notes: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      (value.nonB3Pass && value.originExistsPass && value.originAuthenticPass) ||
      (value.notes ?? "").trim().length >= 10,
    {
      path: ["notes"],
      message: "Gate yang gagal wajib disertai catatan minimal 10 karakter",
    },
  );
export type GateCheckInput = z.infer<typeof gateCheckSchema>;

export const samplePointSchema = z.object({
  point: z.enum(["top", "middle", "bottom"]),
  odorLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  notes: z.string().max(500).optional().or(z.literal("")),
  /** subKey → skor mentah 0-100 untuk sub-kriteria purity & cleanliness. */
  scores: z.record(z.string(), scoreField),
});
export type SamplePointFormInput = z.infer<typeof samplePointSchema>;

export const quantityCheckSchema = z.object({
  actualWeightKg: z
    .number({ message: "Berat timbang ulang wajib diisi" })
    .min(0, "Berat tidak boleh negatif")
    .max(1_000_000),
  specMatchPct: z
    .number({ message: "Persentase kesesuaian wajib diisi" })
    .min(0, "Minimal 0%")
    .max(100, "Maksimal 100%"),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type QuantityCheckInput = z.infer<typeof quantityCheckSchema>;

export const documentationCheckSchema = z.object({
  hasProductionDate: z.boolean(),
  hasMultiAnglePhotos: z.boolean(),
  hasLotNumber: z.boolean(),
  hasLabTest: z.boolean(),
});
export type DocumentationCheckInput = z.infer<typeof documentationCheckSchema>;

/** Payload submit grading dari wizard grader. */
export const gradingSubmitSchema = z.object({
  batchId: z.uuid(),
  samplePoints: z.array(samplePointSchema).length(3, "Wajib tepat 3 titik sampel"),
  quantity: quantityCheckSchema,
  documentation: documentationCheckSchema,
});
export type GradingSubmitInput = z.infer<typeof gradingSubmitSchema>;

/**
 * Perubahan bobot sub-kriteria oleh Admin.
 * Jumlah bobot per kriteria wajib 100 — ditolak, bukan dinormalisasi
 * (kriteria penerimaan A8).
 */
export const categoryWeightsSchema = z
  .object({
    categoryId: z.uuid(),
    weights: z
      .array(
        z.object({
          id: z.uuid(),
          criterion: z.enum(["purity", "cleanliness", "quantity_accuracy"]),
          weightPct: z.number().min(0, "Bobot minimal 0").max(100, "Bobot maksimal 100"),
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    const totals = new Map<string, number>();
    for (const row of value.weights) {
      totals.set(row.criterion, (totals.get(row.criterion) ?? 0) + row.weightPct);
    }
    for (const [criterion, total] of totals) {
      if (Math.abs(total - 100) > 1e-6) {
        ctx.addIssue({
          code: "custom",
          path: ["weights"],
          message: `Jumlah bobot ${criterion} = ${total}, wajib tepat 100`,
        });
      }
    }
  });
export type CategoryWeightsInput = z.infer<typeof categoryWeightsSchema>;

export const revokeCertificateSchema = z.object({
  certificateId: z.uuid(),
  reason: z.string().min(10, "Alasan pencabutan minimal 10 karakter").max(500),
});
export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;

export const assignGraderSchema = z.object({
  batchId: z.uuid(),
  graderId: z.uuid("Grader wajib dipilih"),
});
export type AssignGraderInput = z.infer<typeof assignGraderSchema>;

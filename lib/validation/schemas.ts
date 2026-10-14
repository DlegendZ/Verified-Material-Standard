import { z } from "zod";

/**
 * Skema Zod dipakai BERSAMA client dan server — satu sumber kebenaran
 * (SRD Bab 4.1). Pesan error ditulis dalam bahasa Indonesia karena langsung
 * tampil di form.
 */

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
      (value.nonB3Pass &&
        value.originExistsPass &&
        value.originAuthenticPass) ||
      (value.notes ?? "").trim().length >= 10,
    {
      path: ["notes"],
      message: "Gate yang gagal wajib disertai catatan minimal 10 karakter",
    },
  );
export type GateCheckInput = z.infer<typeof gateCheckSchema>;

export const documentationCheckSchema = z.object({
  hasProductionDate: z.boolean(),
  hasMultiAnglePhotos: z.boolean(),
  hasLotNumber: z.boolean(),
  hasLabTest: z.boolean(),
});
export type DocumentationCheckInput = z.infer<typeof documentationCheckSchema>;

/** Payload submit grading dari wizard grader. */

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
          weightPct: z
            .number()
            .min(0, "Bobot minimal 0")
            .max(100, "Bobot maksimal 100"),
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    const totals = new Map<string, number>();
    for (const row of value.weights) {
      totals.set(
        row.criterion,
        (totals.get(row.criterion) ?? 0) + row.weightPct,
      );
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
import {
  CLAIM_TEXT,
  ERRORS,
  REVISION_TEXT,
  VALIDATION_TEXT,
  GRADER_TEXT,
} from "../text";
/** Angka kosong tetap tidak terisi; desimal Indonesia menerima koma. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim() === "") return NaN;
  return Number(value.trim().replace(",", "."));
}
const numeric = (label: string, min: number, max: number, integer = false) =>
  z.preprocess(
    toNumber,
    (integer
      ? z
          .number({ error: VALIDATION_TEXT.required(label) })
          .int(VALIDATION_TEXT.integer)
      : z.number({ error: VALIDATION_TEXT.required(label) })
    )
      .min(
        min,
        min === 0
          ? VALIDATION_TEXT.nonnegative(label)
          : VALIDATION_TEXT.positive(label),
      )
      .max(max, VALIDATION_TEXT.max(label, max)),
  );
export const bundleClaimSchema = z.object({
  claimMode: z.literal("bundle"),
  bundleCount: numeric(CLAIM_TEXT.bundleCount, 1, 1_000_000, true),
  unitsPerBundle: numeric(CLAIM_TEXT.unitsPerBundle, 1, 1_000_000, true),
  crossSectionWidthCm: numeric(
    CLAIM_TEXT.crossSectionWidthCm,
    Number.MIN_VALUE,
    100,
  ),
  crossSectionThicknessCm: numeric(
    CLAIM_TEXT.crossSectionThicknessCm,
    Number.MIN_VALUE,
    100,
  ),
  lengthCm: numeric(CLAIM_TEXT.lengthCm, Number.MIN_VALUE, 1000),
  crossSectionToleranceCm: numeric(CLAIM_TEXT.crossSectionToleranceCm, 0, 10),
  lengthToleranceCm: numeric(CLAIM_TEXT.lengthToleranceCm, 0, 100),
});
export const weightClaimSchema = z
  .object({
    claimMode: z.literal("weight"),
    lengthMinCm: numeric(CLAIM_TEXT.lengthMinCm, Number.MIN_VALUE, 1000),
    lengthMaxCm: numeric(CLAIM_TEXT.lengthMaxCm, Number.MIN_VALUE, 1000),
    lengthToleranceCm: numeric(CLAIM_TEXT.lengthToleranceCm, 0, 100),
    crossSectionNote: z.string().max(120).optional(),
  })
  .refine((v) => v.lengthMaxCm >= v.lengthMinCm, {
    path: ["lengthMaxCm"],
    message: VALIDATION_TEXT.lengthRange,
  });
export const claimedSpecDetailSchema = z.discriminatedUnion("claimMode", [
  bundleClaimSchema,
  weightClaimSchema,
]);
export type BundleClaim = z.infer<typeof bundleClaimSchema>;
export type WeightClaim = z.infer<typeof weightClaimSchema>;
export type ClaimedSpecDetail = z.infer<typeof claimedSpecDetailSchema>;
const declaration = z.literal(true, { error: ERRORS.declarationRequired });
const date = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    VALIDATION_TEXT.date,
  )
  .optional();
export const batchDraftSchema = z.object({
  categoryId: z.uuid(VALIDATION_TEXT.required(CLAIM_TEXT.category)),
  formProfileId: z.uuid(ERRORS.profileRequired),
  declaredMaterialType: z
    .string()
    .trim()
    .min(2, VALIDATION_TEXT.materialType)
    .max(80),
  claimedWeightKg: numeric(
    CLAIM_TEXT.claimedWeightKg,
    Number.MIN_VALUE,
    1_000_000,
  ),
  claimedSpecDetail: claimedSpecDetailSchema,
  productionDate: date,
  lotNumber: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  declarations: z.object({
    sourceIsProductionResidue: declaration,
    noChemicalTreatment: declaration,
    singleForm: declaration,
  }),
});
export type BatchDraftInput = z.infer<typeof batchDraftSchema>;
const countSchema = z
  .object({ passed: z.number().int().min(0), checked: z.number().int().min(1) })
  .refine((v) => v.passed <= v.checked, {
    path: ["passed"],
    message: VALIDATION_TEXT.countRange,
  });
export const samplePointSchema = z.object({
  point: z.enum(["top", "middle", "bottom"]),
  odorLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  notes: z.string().max(500).optional(),
  scores: z.record(z.string(), z.number().min(0).max(100)),
  unitCounts: z.record(z.string(), countSchema).default({}),
  measurementMethods: z
    .record(z.string(), z.enum(["moisture_meter", "touch_estimate"]))
    .default({}),
});
export type SamplePointFormInput = z.infer<typeof samplePointSchema>;
export const quantityCheckSchema = z
  .object({
    actualWeightKg: numeric(GRADER_TEXT.actualWeight, 0, 1_000_000),
    weighingMoistureNote: z.string().max(200).optional(),
    countChecks: z
      .array(
        z.object({
          key: z.enum([
            "units_per_bundle_top",
            "units_per_bundle_middle",
            "units_per_bundle_bottom",
            "bundle_count",
          ]),
          label: z.string().min(1).max(100),
          claimed: z.number().int().positive().optional(),
          observed: z.number().int().min(0),
        }),
      )
      .max(4)
      .default([]),
    specUnitsPassed: z.number().int().min(0),
    specUnitsChecked: z.number().int().min(1),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => v.specUnitsPassed <= v.specUnitsChecked, {
    path: ["specUnitsPassed"],
    message: VALIDATION_TEXT.countRange,
  });
export type QuantityCheckInput = z.infer<typeof quantityCheckSchema>;
export const gradingSubmitSchema = z.object({
  batchId: z.uuid(),
  samplePoints: z.array(samplePointSchema).length(3),
  quantity: quantityCheckSchema,
  documentation: documentationCheckSchema,
  nonB3Reconfirmed: z.literal(true, {
    error: REVISION_TEXT.nonB3ReconfirmRequired,
  }),
});
export type GradingSubmitInput = z.infer<typeof gradingSubmitSchema>;
export const nonB3FindingSchema = z.object({
  notes: z.string().trim().min(10, VALIDATION_TEXT.findingNotes).max(1000),
});

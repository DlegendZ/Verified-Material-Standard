import { describe, expect, it } from "vitest";
import {
  batchDraftSchema,
  gradingSubmitSchema,
  claimedSpecDetailSchema,
  nonB3FindingSchema,
  toNumber,
} from "./schemas";
import { GS_FIXTURE } from "../scoring/__tests__/fixtures";
const bundle = {
  claimMode: "bundle",
  bundleCount: 20,
  unitsPerBundle: 20,
  crossSectionWidthCm: 3,
  crossSectionThicknessCm: 4,
  lengthCm: 100,
  crossSectionToleranceCm: "0,2",
  lengthToleranceCm: 1,
};
const batch = {
  categoryId: "cccccccc-0000-4000-8000-000000000007",
  formProfileId: "dddddddd-0000-4000-8000-000000000001",
  declaredMaterialType: "Pinus",
  claimedWeightKg: "400",
  claimedSpecDetail: bundle,
  declarations: {
    sourceIsProductionResidue: true,
    noChemicalTreatment: true,
    singleForm: true,
  },
};
describe("validasi klaim pilot & konfirmasi Non-B3", () => {
  it("desimal koma, toleransi nol sah, kosong gagal", () => {
    const r = batchDraftSchema.parse(batch);
    expect(r.claimedWeightKg).toBe(400);
    expect(r.claimedSpecDetail.claimMode).toBe("bundle");
    expect(
      claimedSpecDetailSchema.safeParse({ ...bundle, lengthToleranceCm: 0 })
        .success,
    ).toBe(true);
    expect(
      claimedSpecDetailSchema.safeParse({
        ...bundle,
        crossSectionToleranceCm: "",
      }).success,
    ).toBe(false);
    expect(toNumber("0,2")).toBe(0.2);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(null)).toBeNaN();
  });
  it("deklarasi wajib, rentang panjang valid dan tanggal kalender valid", () => {
    expect(
      batchDraftSchema.safeParse({
        ...batch,
        declarations: { ...batch.declarations, noChemicalTreatment: false },
      }).success,
    ).toBe(false);
    expect(
      batchDraftSchema.safeParse({ ...batch, productionDate: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      claimedSpecDetailSchema.safeParse({
        claimMode: "weight",
        lengthMinCm: 40,
        lengthMaxCm: 15,
        lengthToleranceCm: 1,
      }).success,
    ).toBe(false);
  });
  it("submit wajib konfirmasi ulang Non-B3; catatan temuan ≥10", () => {
    const input = {
      batchId: "aaaaaaaa-0000-4000-8000-000000000001",
      samplePoints: GS_FIXTURE.samplePoints,
      quantity: {
        actualWeightKg: 384,
        countChecks: GS_FIXTURE.quantity.countChecks,
        specUnitsPassed: 25,
        specUnitsChecked: 30,
      },
      documentation: GS_FIXTURE.documentation,
    };
    expect(gradingSubmitSchema.safeParse(input).success).toBe(false);
    expect(
      gradingSubmitSchema.safeParse({ ...input, nonB3Reconfirmed: true })
        .success,
    ).toBe(true);
    expect(nonB3FindingSchema.safeParse({ notes: "lem" }).success).toBe(false);
    expect(
      nonB3FindingSchema.safeParse({
        notes: "Dua batang berlem di ikat Tengah.",
      }).success,
    ).toBe(true);
  });
});

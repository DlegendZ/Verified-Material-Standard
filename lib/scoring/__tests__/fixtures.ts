/** Fixture GS §10; konfigurasi sementara sebelum Fase 2. */
import type {
  CategoryConfig,
  GradingInput,
  SamplePointInput,
  SamplingProfile,
  SubCriterionConfig,
} from "../types";
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
  ...extra,
});
export const SOLID_WOOD: CategoryConfig = {
  code: "solid_wood",
  name: "Kayu Solid",
  criteria: [
    sub("purity", "species_match", "Jenis kayu sesuai deklarasi", 70),
    sub(
      "purity",
      "uniformity",
      "Keseragaman jenis & ukuran dalam 1 titik sampel",
      30,
    ),
    sub("cleanliness", "biological_damage", "Kerusakan biologis", 30, {
      scoringMethod: "unit_count",
    }),
    sub(
      "cleanliness",
      "foreign_contaminant",
      "Kontaminan benda asing (paku/sekrup tertanam)",
      25,
      { scoringMethod: "unit_count" },
    ),
    sub("cleanliness", "moisture", "Kadar kelembapan", 15, {
      requiresMeasurementMethod: true,
    }),
    sub("cleanliness", "physical_defect", "Cacat fisik", 10, {
      scoringMethod: "unit_count",
    }),
    sub("cleanliness", "odor", "Bau", 20, {
      isOdor: true,
      odorOverrideCap: 40,
    }),
    sub("quantity_accuracy", "weight_accuracy", "Akurasi kuantitas", 60),
    sub("quantity_accuracy", "spec_accuracy", "Akurasi dimensi", 40),
  ],
};
export const BUNDLE_PROFILE: SamplingProfile = {
  code: "bundled_sticks",
  unitsPerPoint: 10,
  claimMode: "bundle",
};
export const WEIGHT_ONLY: CategoryConfig = {
  ...SOLID_WOOD,
  code: "synthetic_weight_only",
  criteria: SOLID_WOOD.criteria
    .filter((s) => s.subKey !== "spec_accuracy")
    .map((s) =>
      s.subKey === "weight_accuracy" ? { ...s, weightPct: 100 } : s,
    ),
};
export const GS_FIXTURE: GradingInput = {
  category: SOLID_WOOD,
  samplingProfile: BUNDLE_PROFILE,
  samplePoints: [
    {
      point: "top",
      odorLevel: 1,
      scores: { species_match: 92, uniformity: 85, moisture: 90, odor: 95 },
      unitCounts: {
        biological_damage: { passed: 10, checked: 10 },
        foreign_contaminant: { passed: 10, checked: 10 },
        physical_defect: { passed: 8, checked: 10 },
      },
      measurementMethods: { moisture: "touch_estimate" },
    },
    {
      point: "middle",
      odorLevel: 1,
      scores: { species_match: 90, uniformity: 80, moisture: 85, odor: 90 },
      unitCounts: {
        biological_damage: { passed: 9, checked: 10 },
        foreign_contaminant: { passed: 8, checked: 10 },
        physical_defect: { passed: 7, checked: 10 },
      },
      measurementMethods: { moisture: "touch_estimate" },
    },
    {
      point: "bottom",
      odorLevel: 2,
      scores: { species_match: 80, uniformity: 70, moisture: 55, odor: 70 },
      unitCounts: {
        biological_damage: { passed: 8, checked: 10 },
        foreign_contaminant: { passed: 10, checked: 10 },
        physical_defect: { passed: 7, checked: 10 },
      },
      measurementMethods: { moisture: "touch_estimate" },
    },
  ],
  quantity: {
    claimedWeightKg: 400,
    actualWeightKg: 384,
    countChecks: [
      {
        key: "units_per_bundle_top",
        label: "Isi ikat Atas",
        claimed: 20,
        observed: 20,
      },
      {
        key: "units_per_bundle_middle",
        label: "Isi ikat Tengah",
        claimed: 20,
        observed: 19,
      },
      {
        key: "units_per_bundle_bottom",
        label: "Isi ikat Bawah",
        claimed: 20,
        observed: 20,
      },
    ],
    specUnits: { passed: 25, checked: 30 },
  },
  documentation: {
    hasProductionDate: true,
    hasMultiAnglePhotos: true,
    hasLotNumber: false,
    hasLabTest: false,
  },
};
export function flatPoints(
  value = 100,
  odorLevels: [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3] = [1, 1, 1],
): SamplePointInput[] {
  return (["top", "middle", "bottom"] as const).map((point, i) => ({
    point,
    odorLevel: odorLevels[i],
    scores: {
      species_match: value,
      uniformity: value,
      moisture: value,
      odor: value,
    },
    unitCounts: Object.fromEntries(
      ["biological_damage", "foreign_contaminant", "physical_defect"].map(
        (key) => [key, { passed: 10, checked: 10 }],
      ),
    ),
    measurementMethods: { moisture: "moisture_meter" },
  }));
}
export function perfectInput(
  overrides: Partial<GradingInput> = {},
): GradingInput {
  return {
    category: SOLID_WOOD,
    samplePoints: flatPoints(),
    quantity: { claimedWeightKg: 100, actualWeightKg: 100, specMatchPct: 100 },
    documentation: {
      hasProductionDate: true,
      hasMultiAnglePhotos: true,
      hasLotNumber: true,
      hasLabTest: true,
    },
    ...overrides,
  };
}

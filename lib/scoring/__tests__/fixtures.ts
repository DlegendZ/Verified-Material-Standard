import { DEMO_SPECS } from "../../../scripts/demo-specs";
import { canonicalCountChecks } from "@/lib/grading-input";
import { findSeedCategory } from "@/lib/categories";
import type {
  CategoryConfig,
  GradingInput,
  SamplePointInput,
  SamplingProfile,
} from "../types";
export const SOLID_WOOD = findSeedCategory("solid_wood");
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
const workedExample = DEMO_SPECS.find((s) => s.batchCode === "DEMO-B-002")!;
export const GS_FIXTURE: GradingInput = {
  category: SOLID_WOOD,
  samplingProfile: BUNDLE_PROFILE,
  samplePoints: workedExample.samplePoints,
  quantity: {
    claimedWeightKg: workedExample.claimedWeightKg,
    actualWeightKg: workedExample.quantity.actualWeightKg,
    countChecks: canonicalCountChecks(
      workedExample.claimedSpecDetail,
      workedExample.quantity.countChecks,
    ),
    specUnits: workedExample.quantity.specUnits,
  },
  documentation: workedExample.documentation,
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

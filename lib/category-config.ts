import type { CategoryConfig, SamplingProfile } from "./scoring";
import type {
  CategoryCriterionRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "./types/db";

export function toCategoryConfig(
  category: Pick<MaterialCategoryRow, "code" | "name">,
  rows: CategoryCriterionRow[],
): CategoryConfig {
  return {
    code: category.code,
    name: category.name,
    criteria: rows.map((row) => ({
      criterion: row.criterion,
      subKey: row.sub_key,
      label: row.label,
      weightPct: Number(row.weight_pct),
      isOdor: row.is_odor,
      odorOverrideCap: row.odor_override_cap,
      scoringMethod: row.scoring_method ?? "scale",
      requiresMeasurementMethod: row.requires_measurement_method ?? false,
      helpText: row.help_text,
    })),
  };
}
export function toFormProfile(row: MaterialFormProfileRow): SamplingProfile {
  return {
    code: row.code,
    unitsPerPoint: row.units_per_point,
    claimMode: row.claim_mode,
  };
}

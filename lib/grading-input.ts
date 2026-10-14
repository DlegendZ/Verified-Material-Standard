import { ScoringError, type CountCheckInput } from "./scoring";
import { GRADER_TEXT, SAMPLE_POINT_LABELS } from "./text";
import type { ClaimedSpecDetail } from "./validation/schemas";

/** Klaim dan label berasal dari batch/konfigurasi, bukan payload client. */
export function canonicalCountChecks(
  detail: ClaimedSpecDetail,
  checks: { key: string; observed: number }[],
): CountCheckInput[] {
  if (detail.claimMode === "weight") return [];
  const result: CountCheckInput[] = [];
  for (const point of ["top", "middle", "bottom"] as const) {
    const key = `units_per_bundle_${point}`;
    const found = checks.filter((c) => c.key === key);
    if (found.length !== 1)
      throw new ScoringError(
        "COUNT_CHECKS_REQUIRED",
        GRADER_TEXT.countChecksRequired,
      );
    result.push({
      key,
      label: GRADER_TEXT.bundleObserved(SAMPLE_POINT_LABELS[point]),
      claimed: detail.unitsPerBundle,
      observed: found[0].observed,
    });
  }
  const bundles = checks.filter((c) => c.key === "bundle_count");
  if (bundles.length > 1)
    throw new ScoringError(
      "COUNT_CHECK_INVALID",
      GRADER_TEXT.countChecksRequired,
    );
  if (bundles.length)
    result.push({
      key: "bundle_count",
      label: GRADER_TEXT.bundleCountObserved,
      claimed: detail.bundleCount,
      observed: bundles[0].observed,
    });
  return result;
}

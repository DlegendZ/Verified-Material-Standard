import { describe, expect, it } from "vitest";
import { DEMO_SPECS } from "../../../scripts/demo-specs";
import { findSeedCategory } from "../../categories";
import { canonicalCountChecks } from "../../grading-input";
import { computeGrading } from "../index";
const category = findSeedCategory("solid_wood");
describe("Lampiran B — angka 7 batch demo Kayu Solid", () => {
  it.each(DEMO_SPECS.map((s) => [s.batchCode, s] as const))(
    "%s sesuai fixture domain (toleransi 0,01)",
    (_, spec) => {
      if (spec.expected === null) {
        expect(spec.outcome).toBe("rejected_gate");
        expect(spec.gate?.nonB3Pass).toBe(false);
        expect(spec.samplePoints).toEqual([]);
        return;
      }
      const profile = category.profiles.find(
        (p) => p.code === spec.profileCode,
      )!;
      const r = computeGrading({
        category,
        samplingProfile: {
          code: profile.code,
          unitsPerPoint: profile.unitsPerPoint,
          claimMode: profile.claimMode,
        },
        samplePoints: spec.samplePoints,
        quantity: {
          claimedWeightKg: spec.claimedWeightKg,
          actualWeightKg: spec.quantity.actualWeightKg,
          countChecks: canonicalCountChecks(
            spec.claimedSpecDetail,
            spec.quantity.countChecks,
          ),
          specUnits: spec.quantity.specUnits,
        },
        documentation: spec.documentation,
      });
      for (const [key, expected] of Object.entries({
        purityScore: spec.expected.purity,
        cleanlinessScore: spec.expected.cleanliness,
        consistencyScore: spec.expected.consistency,
        quantityScore: spec.expected.quantity,
        documentationScore: spec.expected.documentation,
        finalScoreRaw: spec.expected.raw,
      }))
        expect(
          Math.abs(r[key as "finalScoreRaw"] - expected),
        ).toBeLessThanOrEqual(0.01);
      expect(r.finalScore).toBe(spec.expected.score);
      expect(r.grade).toBe(spec.expected.grade);
    },
  );
});

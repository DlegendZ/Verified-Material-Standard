import { describe, expect, it } from "vitest";
import { normalizeBreakdown } from "./breakdown";
import { computeGrading } from "./scoring";
import { GS_FIXTURE } from "./scoring/__tests__/fixtures";
describe("compatibilité breakdown v1/v2 (A27)", () => {
  it("v2 identik tanpa menghitung ulang", () => {
    const r = computeGrading(GS_FIXTURE);
    expect(normalizeBreakdown(r.breakdown, r.scoringVersion)).toEqual(
      r.breakdown,
    );
  });
  it("v1 mempertahankan skor dan melengkapi field baru", () => {
    const full = computeGrading(GS_FIXTURE).breakdown;
    const old = {
      samplePoints: full.samplePoints.map((p) => ({
        ...p,
        contributions: p.contributions.map(
          ({
            criterion,
            subKey,
            label,
            rawScore,
            weightPct,
            contribution,
            ignoredByOverride,
          }) => ({
            criterion,
            subKey,
            label,
            rawScore,
            weightPct,
            contribution,
            ignoredByOverride,
          }),
        ),
      })),
      consistency: full.consistency,
      quantity: {
        deviationPct: 4,
        weightScore: 80,
        specScore: 75,
        weightWeightPct: 60,
        specWeightPct: 40,
        score: 78,
      },
      documentation: full.documentation,
      final: full.final,
    };
    const normalized = normalizeBreakdown(old, "1.0.0");
    expect(normalized.final).toEqual(old.final);
    expect(normalized.samplePoints[0].contributions[0].rawScore).toBe(92);
    expect(normalized.samplePoints[0].contributions[0].method).toBe("scale");
    expect(normalized.samplingProfile).toBeNull();
    expect(normalized.quantity.weightDeviationPct).toBe(4);
    expect(normalized.quantity.countChecks).toEqual([]);
    expect(normalized.quantity.specMatchPct).toBeNull();
  });
  it.each([null, undefined, {}, { samplePoints: [null], final: [42] }])(
    "payload tidak lengkap tetap aman %j",
    (raw) => {
      const normalized = normalizeBreakdown(raw, "1.0.0");
      expect(normalized.samplePoints).toEqual([]);
      expect(normalized.final).toEqual([]);
    },
  );
});

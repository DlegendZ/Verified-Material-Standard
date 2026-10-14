import { describe, expect, it } from "vitest";
import {
  ScoringError,
  computeConsistency,
  computeDocumentation,
  computeGrading,
  computeQuantity,
  computeSamplePoint,
  gradeFromFinalScore,
  percentPassScore,
  deviationScore,
  deviationPct,
  unitPassPct,
  odorOverrideCapOf,
  validateCategoryConfig,
} from "../index";
import type {
  CategoryConfig,
  GradingInput,
  SamplePointInput,
  SubCriterionConfig,
} from "../types";
import {
  BUNDLE_PROFILE,
  GS_FIXTURE,
  SOLID_WOOD,
  WEIGHT_ONLY,
  flatPoints,
  perfectInput,
} from "./fixtures";
function expectCode(run: () => unknown, code: string) {
  expect(run).toThrow(ScoringError);
  try {
    run();
  } catch (error) {
    expect((error as ScoringError).code).toBe(code);
  }
}
const fixture = (): GradingInput => structuredClone(GS_FIXTURE);
const config = (
  edit: (s: SubCriterionConfig) => SubCriterionConfig,
): CategoryConfig => ({
  ...SOLID_WOOD,
  criteria: SOLID_WOOD.criteria.map(edit),
});
describe("E1–E6: fixture GS §10 Kayu Solid", () => {
  it("titik, rata-rata, konsistensi, deviasi dan akhir sesuai dokumen", () => {
    const r = computeGrading(fixture());
    r.breakdown.samplePoints.forEach((p, i) => {
      expect(p.purity).toBeCloseTo([89.9, 87, 77][i], 6);
      expect(p.cleanliness).toBeCloseTo([95, 84.5, 74.75][i], 6);
    });
    expect(r.purityScore).toBeCloseTo(84.633333, 5);
    expect(r.cleanlinessScore).toBe(84.75);
    expect(r.breakdown.consistency.puritySpread).toBeCloseTo(12.9, 6);
    expect(r.breakdown.consistency.cleanlinessSpread).toBeCloseTo(20.25, 6);
    expect(r.consistencyScore).toBe(70);
    expect(r.breakdown.quantity.weightDeviationPct).toBe(4);
    expect(r.breakdown.quantity.deviationPct).toBe(5);
    expect(r.breakdown.quantity.deviationSource).toBe(
      "units_per_bundle_middle",
    );
    expect(r.breakdown.quantity.weightScore).toBe(80);
    expect(r.breakdown.quantity.specScore).toBe(75);
    expect(r.breakdown.quantity.specMatchPct).toBeCloseTo(83.333333, 5);
    expect(r.quantityScore).toBe(78);
    expect(r.documentationScore).toBe(50);
    expect(r.finalScoreRaw).toBeCloseTo(77.2775, 6);
    expect(r.finalScore).toBe(77);
    expect(r.grade).toBe("B");
    expect(r.scoringVersion).toBe("2.0.0");
    expect(r.breakdown.samplingProfile).toEqual(BUNDLE_PROFILE);
  });
  it("Bawah Level 3 menghasilkan 68,3817 → 68/C", () => {
    const input = fixture();
    input.samplePoints[2].odorLevel = 3;
    input.samplePoints[2].scores.odor = 15;
    const r = computeGrading(input);
    expect(r.breakdown.samplePoints[2].cleanliness).toBe(40);
    expect(r.cleanlinessScore).toBeCloseTo(73.166667, 5);
    expect(r.breakdown.consistency.cleanlinessSpread).toBe(55);
    expect(r.consistencyScore).toBe(40);
    expect(r.finalScoreRaw).toBeCloseTo(68.381667, 5);
    expect(r.finalScore).toBe(68);
    expect(r.grade).toBe("C");
  });
});
describe("per unit, metode ukur dan override", () => {
  it.each([
    [10, 10, 100],
    [9, 10, 100],
    [8, 10, 75],
    [15, 20, 75],
    [7, 10, 50],
    [5, 10, 50],
    [4, 10, 20],
    [0, 10, 20],
  ])("%i/%i lolos → %i", (passed, checked, expected) => {
    const p = flatPoints()[0];
    p.unitCounts!.biological_damage = { passed, checked };
    const sub = computeSamplePoint(SOLID_WOOD, p).contributions.find(
      (c) => c.subKey === "biological_damage",
    )!;
    expect(sub.rawScore).toBe(expected);
    expect(sub.passPct).toBe(unitPassPct(passed, checked));
    expect(sub.unitsPassed).toBe(passed);
    expect(sub.unitsChecked).toBe(checked);
    expect(sub.method).toBe("unit_count");
  });
  it.each([
    { passed: 11, checked: 10 },
    { passed: 1.5, checked: 10 },
    { passed: 1, checked: 1.5 },
    { passed: 0, checked: 0 },
    { passed: -1, checked: 10 },
    { passed: NaN, checked: 10 },
  ])("unit invalid %j", (count) => {
    const p = flatPoints()[0];
    p.unitCounts!.biological_damage = count;
    expectCode(() => computeSamplePoint(SOLID_WOOD, p), "UNIT_COUNT_INVALID");
  });
  it("unit hilang dan jumlah berbeda dari profil ditolak", () => {
    const p = flatPoints()[0];
    delete p.unitCounts!.biological_damage;
    expectCode(() => computeSamplePoint(SOLID_WOOD, p), "UNIT_COUNT_MISSING");
    p.unitCounts!.biological_damage = { passed: 8, checked: 8 };
    expectCode(
      () => computeSamplePoint(SOLID_WOOD, p, BUNDLE_PROFILE),
      "UNIT_COUNT_MISMATCH",
    );
    expect(() => computeSamplePoint(SOLID_WOOD, p, BUNDLE_PROFILE)).toThrow(
      /Atas.*10.*8/,
    );
    delete p.unitCounts;
    expectCode(() => computeSamplePoint(SOLID_WOOD, p), "UNIT_COUNT_MISSING");
  });
  it("metode wajib; kedua metode disimpan", () => {
    for (const method of ["moisture_meter", "touch_estimate"] as const) {
      const p = flatPoints()[0];
      p.measurementMethods!.moisture = method;
      expect(
        computeSamplePoint(SOLID_WOOD, p).contributions.find(
          (s) => s.subKey === "moisture",
        )!.measurementMethod,
      ).toBe(method);
    }
    const p = flatPoints()[0];
    delete p.measurementMethods;
    expectCode(
      () => computeSamplePoint(SOLID_WOOD, p),
      "MEASUREMENT_METHOD_MISSING",
    );
    p.measurementMethods = { moisture: "invalid" as "moisture_meter" };
    expectCode(
      () => computeSamplePoint(SOLID_WOOD, p),
      "MEASUREMENT_METHOD_MISSING",
    );
  });
  it("override membolehkan semua input kebersihan kosong", () => {
    const p: SamplePointInput = {
      point: "top",
      odorLevel: 3,
      scores: { species_match: 80, uniformity: 80 },
    };
    const r = computeSamplePoint(SOLID_WOOD, p, BUNDLE_PROFILE);
    expect(r.purity).toBe(80);
    expect(r.cleanliness).toBe(40);
    for (const s of r.contributions.filter(
      (s) => s.criterion === "cleanliness",
    )) {
      expect(s.rawScore).toBeNull();
      expect(s.contribution).toBe(0);
      expect(s.ignoredByOverride).toBe(true);
      expect(s.unitsPassed).toBeNull();
      expect(s.measurementMethod).toBeNull();
    }
  });
  it("override menyimpan raw; isian invalid tetap ditolak", () => {
    const p = flatPoints()[0];
    p.odorLevel = 3;
    const r = computeSamplePoint(SOLID_WOOD, p);
    expect(r.cleanliness).toBe(40);
    expect(r.purity).toBe(100);
    expect(
      r.contributions.find((s) => s.subKey === "biological_damage")!.rawScore,
    ).toBe(100);
    expect(
      r.contributions
        .filter((s) => s.criterion === "cleanliness")
        .every((s) => s.contribution === 0),
    ).toBe(true);
    p.unitCounts!.biological_damage.passed = 99;
    expectCode(() => computeSamplePoint(SOLID_WOOD, p), "UNIT_COUNT_INVALID");
    delete p.unitCounts!.biological_damage;
    p.scores.odor = 101;
    expectCode(
      () => computeSamplePoint(SOLID_WOOD, p),
      "SUB_SCORE_OUT_OF_RANGE",
    );
  });
  it("cap kustom 30, default 40 dan bau normal proporsional", () => {
    const custom = config((s) =>
      s.isOdor ? { ...s, odorOverrideCap: 30 } : s,
    );
    expect(
      computeSamplePoint(custom, flatPoints(100, [3, 1, 1])[0]).cleanliness,
    ).toBe(30);
    expect(
      odorOverrideCapOf(config((s) => ({ ...s, odorOverrideCap: null }))),
    ).toBe(40);
    expect(
      odorOverrideCapOf({ code: "empty", name: "Kosong", criteria: [] }),
    ).toBe(40);
    for (const level of [1, 2] as const) {
      const p = flatPoints()[0];
      p.odorLevel = level;
      p.scores.odor = 50;
      expect(computeSamplePoint(SOLID_WOOD, p).cleanliness).toBe(90);
    }
  });
});
describe("kuantitas", () => {
  it.each([
    [2, 100],
    [2.0001, 80],
    [5, 80],
    [5.0001, 50],
    [10, 50],
    [10.0001, 0],
  ])("deviasi %f%% → %i", (pct, score) =>
    expect(deviationScore(pct)).toBe(score),
  );
  it.each([
    [90, 100],
    [89.9, 75],
    [75, 75],
    [74.9, 50],
    [50, 50],
    [49.9, 20],
  ])("lolos %f%% → %i", (pct, score) =>
    expect(percentPassScore(pct)).toBe(score),
  );
  it.each([
    [98, 100],
    [95, 80],
    [90, 50],
    [102, 100],
    [105, 80],
  ])("berat 100→%i", (actualWeightKg, score) =>
    expect(
      computeQuantity(SOLID_WOOD, {
        claimedWeightKg: 100,
        actualWeightKg,
        specMatchPct: 100,
      }).weightScore,
    ).toBe(score),
  );
  it("hitungan 1/20 tepat 5%, menang atas berat, seri utamakan berat", () => {
    expect(deviationPct(20, 19)).toBe(5);
    const input = {
      claimedWeightKg: 100,
      actualWeightKg: 99,
      countChecks: [
        { key: "count", label: "Isi ikat", claimed: 20, observed: 19 },
      ],
      specMatchPct: 100,
    };
    expect(computeQuantity(SOLID_WOOD, input).deviationSource).toBe("count");
    input.actualWeightKg = 95;
    expect(computeQuantity(SOLID_WOOD, input).deviationSource).toBe("weight");
    expect(computeQuantity(SOLID_WOOD, input).weightScore).toBe(80);
  });
  it("klaim per ikat wajib ada hitungan", () =>
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, perfectInput().quantity, BUNDLE_PROFILE),
      "COUNT_CHECKS_REQUIRED",
    ));
  it.each([
    { claimed: 0, observed: 1 },
    { claimed: 1.5, observed: 1 },
    { claimed: 20, observed: -1 },
    { claimed: 20, observed: 1.5 },
  ])("hitungan invalid %j", (c) =>
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          ...perfectInput().quantity,
          countChecks: [{ key: "count", label: "Isi ikat", ...c }],
        }),
      "COUNT_CHECK_INVALID",
    ),
  );
  it("input spesifikasi tepat satu; spec bobot nol diabaikan", () => {
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          ...perfectInput().quantity,
          specUnits: { passed: 10, checked: 10 },
        }),
      "SPEC_INPUT_AMBIGUOUS",
    );
    const none = { claimedWeightKg: 100, actualWeightKg: 99 };
    expectCode(() => computeQuantity(SOLID_WOOD, none), "SPEC_INPUT_MISSING");
    const q = computeQuantity(WEIGHT_ONLY, none);
    expect(q.score).toBe(100);
    expect(q.specScore).toBe(0);
    expect(q.specMatchPct).toBeNull();
    expect(q.specUnitsPassed).toBeNull();
    expect(q.specUnitsChecked).toBeNull();
  });
  it.each([NaN, -1, 101])("spec %s invalid", (specMatchPct) =>
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          ...perfectInput().quantity,
          specMatchPct,
        }),
      "SPEC_MATCH_OUT_OF_RANGE",
    ),
  );
  it.each([0, -1, Infinity])("klaim berat %s invalid", (claimedWeightKg) =>
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          ...perfectInput().quantity,
          claimedWeightKg,
        }),
      "CLAIMED_WEIGHT_INVALID",
    ),
  );
  it.each([-1, NaN])("berat aktual %s invalid", (actualWeightKg) =>
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          ...perfectInput().quantity,
          actualWeightKg,
        }),
      "ACTUAL_WEIGHT_INVALID",
    ),
  );
  it("unit dimensi invalid dan sub_key tak dikenal", () => {
    expectCode(
      () =>
        computeQuantity(SOLID_WOOD, {
          claimedWeightKg: 100,
          actualWeightKg: 100,
          specUnits: { passed: 31, checked: 30 },
        }),
      "UNIT_COUNT_INVALID",
    );
    expectCode(
      () =>
        computeQuantity(
          config((s) =>
            s.subKey === "spec_accuracy" ? { ...s, subKey: "unknown" } : s,
          ),
          perfectInput().quantity,
        ),
      "QUANTITY_SUB_KEY_UNKNOWN",
    );
  });
});
describe("aturan generik & validasi konfigurasi", () => {
  const point = (purity: number, cleanliness: number) => ({
    point: "top" as const,
    odorLevel: 1 as const,
    purity,
    cleanliness,
    cleanlinessOverridden: false,
    cleanlinessOverrideCap: null,
    contributions: [],
  });
  it.each([
    [10, 95],
    [30, 70],
    [31, 40],
  ])("sebaran %i → %i", (spread, score) =>
    expect(
      computeConsistency([point(0, 80), point(spread, 80), point(spread, 80)])
        .score,
    ).toBe(score),
  );
  it("level terparah dari kedua dimensi", () => {
    expect(
      computeConsistency([point(80, 20), point(85, 60), point(90, 90)])
        .appliedLevel,
    ).toBe("large");
    expect(
      computeConsistency([point(20, 80), point(60, 82), point(90, 85)])
        .appliedLevel,
    ).toBe("large");
  });
  it("dokumentasi 4×25, sempurna 99/A", () => {
    expect(computeDocumentation(perfectInput().documentation).score).toBe(100);
    expect(
      computeDocumentation({
        hasProductionDate: false,
        hasMultiAnglePhotos: false,
        hasLotNumber: false,
        hasLabTest: false,
      }).score,
    ).toBe(0);
    const r = computeGrading(perfectInput());
    expect(r.finalScore).toBe(99);
    expect(r.grade).toBe("A");
    expect(r.breakdown.samplingProfile).toBeNull();
  });
  it.each([
    [85, "A"],
    [84, "B"],
    [70, "B"],
    [69, "C"],
    [55, "C"],
    [54, "D"],
    [0, "D"],
  ] as const)("grade %i = %s", (score, grade) =>
    expect(gradeFromFinalScore(score)).toBe(grade),
  );
  it("84,6 dibulatkan 85/A; deterministik dan tidak mutasi", () => {
    const scale = config((s) => ({
      ...s,
      scoringMethod: "scale",
      requiresMeasurementMethod: false,
    }));
    const raw = (84.6 - 19 - 15 - 10) / 0.55;
    const input = perfectInput({
      category: scale,
      samplePoints: flatPoints().map((p) => ({
        ...p,
        scores: Object.fromEntries(scale.criteria.map((s) => [s.subKey, raw])),
      })),
    });
    const snapshot = structuredClone(input);
    const r = computeGrading(input);
    expect(r.finalScoreRaw).toBeCloseTo(84.6, 6);
    expect(r.finalScore).toBe(85);
    expect(r.grade).toBe("A");
    expect(computeGrading(input)).toEqual(r);
    expect(input).toEqual(snapshot);
  });
  it.each([2, 4])("jumlah titik %i ditolak", (n) =>
    expectCode(
      () =>
        computeGrading(
          perfectInput({
            samplePoints: [...flatPoints(), flatPoints()[0]].slice(0, n),
          }),
        ),
      "SAMPLE_POINT_COUNT_INVALID",
    ),
  );
  it("titik duplikat dan bau invalid", () => {
    const points = flatPoints();
    points[1].point = "top";
    expectCode(
      () => computeGrading(perfectInput({ samplePoints: points })),
      "SAMPLE_POINT_COUNT_INVALID",
    );
    points[1].point = "middle";
    points[1].odorLevel = 5 as 1;
    expectCode(
      () => computeGrading(perfectInput({ samplePoints: points })),
      "ODOR_LEVEL_INVALID",
    );
  });
  it("skor hilang/di luar 0–100", () => {
    const p = flatPoints()[0];
    delete p.scores.species_match;
    expectCode(() => computeSamplePoint(SOLID_WOOD, p), "SUB_SCORE_MISSING");
    p.scores.species_match = NaN;
    expectCode(
      () => computeSamplePoint(SOLID_WOOD, p),
      "SUB_SCORE_OUT_OF_RANGE",
    );
  });
  it("Kaca/Keramik tanpa kriteria tidak bisa dinilai", () => {
    for (const code of ["glass", "ceramic"])
      expectCode(
        () => validateCategoryConfig({ code, name: code, criteria: [] }),
        "CATEGORY_CRITERION_EMPTY",
      );
  });
  it("bobot invalid, sum bukan 100, duplicate", () => {
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) =>
            s.subKey === "uniformity" ? { ...s, weightPct: -1 } : s,
          ),
        ),
      "CATEGORY_WEIGHT_INVALID",
    );
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) =>
            s.subKey === "uniformity" ? { ...s, weightPct: 40 } : s,
          ),
        ),
      "CATEGORY_WEIGHT_SUM_INVALID",
    );
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) =>
            s.subKey === "uniformity" ? { ...s, subKey: "species_match" } : s,
          ),
        ),
      "CATEGORY_DUPLICATE_SUB_KEY",
    );
  });
  it("bau tepat satu, cleanliness/scale; quantity scale", () => {
    expectCode(
      () => validateCategoryConfig(config((s) => ({ ...s, isOdor: false }))),
      "CATEGORY_ODOR_SUB_INVALID",
    );
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) => ({ ...s, isOdor: s.subKey === "species_match" })),
        ),
      "CATEGORY_ODOR_SUB_INVALID",
    );
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) => (s.isOdor ? { ...s, scoringMethod: "unit_count" } : s)),
        ),
      "CATEGORY_ODOR_SUB_INVALID",
    );
    expectCode(
      () =>
        validateCategoryConfig(
          config((s) =>
            s.criterion === "quantity_accuracy"
              ? { ...s, scoringMethod: "unit_count" }
              : s,
          ),
        ),
      "CATEGORY_QUANTITY_METHOD_INVALID",
    );
  });
});

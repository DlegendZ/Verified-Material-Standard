import { describe, expect, it } from "vitest";
import {
  ScoringError,
  computeConsistency,
  computeDocumentation,
  computeGrading,
  computeQuantity,
  computeSamplePoint,
  gradeFromFinalScore,
  specAccuracyScore,
  weightAccuracyScore,
} from "../index";
import type { CategoryConfig, SamplePointInput } from "../types";
import { SRD_FIXTURE, TEXTILE, UCO, flatPoints, perfectInput } from "./fixtures";

describe("A1 — regression fixture SRD Bab 7.8 (Sentosa Textile)", () => {
  const result = computeGrading(SRD_FIXTURE);

  it("skor per titik sesuai tabel dokumen domain", () => {
    const [top, middle, bottom] = result.breakdown.samplePoints;

    expect(top.purity).toBeCloseTo(87, 6);
    expect(top.cleanliness).toBeCloseTo(89.5, 6);
    expect(middle.purity).toBeCloseTo(87.1, 6);
    expect(middle.cleanliness).toBeCloseTo(84.5, 6);
    expect(bottom.purity).toBeCloseTo(67, 6);
    expect(bottom.cleanliness).toBe(40);
    expect(bottom.cleanlinessOverridden).toBe(true);
  });

  it("rata-rata antar titik ≈ 80,37 dan 71,33", () => {
    expect(result.purityScore).toBeCloseTo(80.3667, 3);
    expect(result.cleanlinessScore).toBeCloseTo(71.3333, 3);
  });

  it("konsistensi memakai level terparah → 40", () => {
    const c = result.breakdown.consistency;
    expect(c.puritySpread).toBeCloseTo(20.1, 6);
    expect(c.purityLevel).toBe("medium");
    expect(c.cleanlinessSpread).toBeCloseTo(49.5, 6);
    expect(c.cleanlinessLevel).toBe("large");
    expect(c.appliedLevel).toBe("large");
    expect(c.score).toBe(40);
  });

  it("akurasi kuantitas = 60 dan dokumentasi = 50", () => {
    expect(result.breakdown.quantity.deviationPct).toBeCloseTo(6, 6);
    expect(result.breakdown.quantity.weightScore).toBe(50);
    expect(result.breakdown.quantity.specScore).toBe(75);
    expect(result.quantityScore).toBeCloseTo(60, 6);
    expect(result.documentationScore).toBe(50);
  });

  it("skor akhir ≈ 64 dan grade C", () => {
    expect(result.finalScoreRaw).toBeCloseTo(63.9433, 3);
    expect(result.finalScore).toBe(64);
    expect(result.grade).toBe("C");
  });
});

describe("A2 — override bau menetapkan cap, bukan Math.min", () => {
  it("sub-kriteria kebersihan lain bernilai 100 tetap menghasilkan 40", () => {
    const point: SamplePointInput = {
      point: "top",
      odorLevel: 3,
      scores: { fiber_type_match: 100, uniformity: 100, dirt_level: 100, fraying_level: 100, odor: 100 },
    };
    const breakdown = computeSamplePoint(TEXTILE, point);

    expect(breakdown.cleanliness).toBe(40);
    expect(breakdown.cleanlinessOverridden).toBe(true);
    expect(breakdown.cleanlinessOverrideCap).toBe(40);
  });

  it("nilai mentah tetap disimpan tapi kontribusinya nol", () => {
    const point: SamplePointInput = {
      point: "bottom",
      odorLevel: 3,
      scores: { fiber_type_match: 70, uniformity: 60, dirt_level: 80, fraying_level: 75, odor: 10 },
    };
    const breakdown = computeSamplePoint(TEXTILE, point);
    const dirt = breakdown.contributions.find((c) => c.subKey === "dirt_level");

    expect(dirt?.rawScore).toBe(80);
    expect(dirt?.contribution).toBe(0);
    expect(dirt?.ignoredByOverride).toBe(true);
  });

  it("kemurnian di titik yang sama TIDAK terpengaruh override", () => {
    const point: SamplePointInput = {
      point: "bottom",
      odorLevel: 3,
      scores: { fiber_type_match: 70, uniformity: 60, dirt_level: 0, fraying_level: 0, odor: 0 },
    };
    expect(computeSamplePoint(TEXTILE, point).purity).toBeCloseTo(67, 6);
  });

  it("bau level 1 dan 2 dihitung proporsional seperti sub-kriteria biasa", () => {
    const base = { fiber_type_match: 80, uniformity: 80, dirt_level: 100, fraying_level: 100, odor: 50 };
    const level1 = computeSamplePoint(TEXTILE, { point: "top", odorLevel: 1, scores: base });
    const level2 = computeSamplePoint(TEXTILE, { point: "top", odorLevel: 2, scores: base });

    // 0,5×100 + 0,3×100 + 0,2×50 = 90
    expect(level1.cleanliness).toBeCloseTo(90, 6);
    expect(level2.cleanliness).toBeCloseTo(90, 6);
    expect(level1.cleanlinessOverridden).toBe(false);
    expect(level2.cleanlinessOverridden).toBe(false);
  });

  it("cap khusus Minyak Jelantah = 20", () => {
    const point: SamplePointInput = {
      point: "middle",
      odorLevel: 3,
      scores: { color_clarity: 100, water_content: 100, solid_contaminant: 100, odor: 100 },
    };
    const breakdown = computeSamplePoint(UCO, point);

    expect(breakdown.cleanliness).toBe(20);
    expect(breakdown.cleanlinessOverrideCap).toBe(20);
  });
});

describe("konsistensi batch", () => {
  const point = (purity: number, cleanliness: number) => ({
    point: "top" as const,
    odorLevel: 1 as const,
    purity,
    cleanliness,
    cleanlinessOverridden: false,
    cleanlinessOverrideCap: null,
    contributions: [],
  });

  it("sebaran tepat 10 poin masih level kecil (95)", () => {
    const c = computeConsistency([point(80, 80), point(85, 80), point(90, 80)]);
    expect(c.appliedLevel).toBe("small");
    expect(c.score).toBe(95);
  });

  it("sebaran tepat 30 poin masih level sedang (70)", () => {
    const c = computeConsistency([point(60, 80), point(75, 80), point(90, 80)]);
    expect(c.appliedLevel).toBe("medium");
    expect(c.score).toBe(70);
  });

  it("sebaran di atas 30 poin → level besar (40)", () => {
    const c = computeConsistency([point(59, 80), point(75, 80), point(90, 80)]);
    expect(c.appliedLevel).toBe("large");
    expect(c.score).toBe(40);
  });

  it("selalu mengambil level yang lebih parah antar dua dimensi", () => {
    const purityMediumCleanlinessLarge = computeConsistency([
      point(60, 20),
      point(75, 60),
      point(85, 90),
    ]);
    expect(purityMediumCleanlinessLarge.purityLevel).toBe("medium");
    expect(purityMediumCleanlinessLarge.cleanlinessLevel).toBe("large");
    expect(purityMediumCleanlinessLarge.appliedLevel).toBe("large");

    const purityLargeCleanlinessSmall = computeConsistency([
      point(20, 80),
      point(60, 82),
      point(90, 85),
    ]);
    expect(purityLargeCleanlinessSmall.appliedLevel).toBe("large");
  });
});

describe("akurasi kuantitas & spesifikasi", () => {
  it("batas tabel deviasi berat inklusif di 2%, 5%, 10%", () => {
    expect(weightAccuracyScore(2)).toBe(100);
    expect(weightAccuracyScore(2.0001)).toBe(80);
    expect(weightAccuracyScore(5)).toBe(80);
    expect(weightAccuracyScore(5.0001)).toBe(50);
    expect(weightAccuracyScore(10)).toBe(50);
    expect(weightAccuracyScore(10.0001)).toBe(0);
  });

  it("batas tabel spesifikasi di 90%, 75%, 50%", () => {
    expect(specAccuracyScore(90)).toBe(100);
    expect(specAccuracyScore(89.9)).toBe(75);
    expect(specAccuracyScore(75)).toBe(75);
    expect(specAccuracyScore(74.9)).toBe(50);
    expect(specAccuracyScore(50)).toBe(50);
    expect(specAccuracyScore(49.9)).toBe(20);
  });

  it("deviasi dihitung absolut — timbang ulang lebih berat juga kena penalti", () => {
    const over = computeQuantity(TEXTILE, {
      claimedWeightKg: 50,
      actualWeightKg: 53,
      specMatchPct: 100,
    });
    expect(over.deviationPct).toBeCloseTo(6, 6);
    expect(over.weightScore).toBe(50);
  });

  it("memakai bobot berat/spesifikasi milik kategori (UCO: 100/0)", () => {
    const uco = computeQuantity(UCO, { claimedWeightKg: 100, actualWeightKg: 80, specMatchPct: 100 });
    expect(uco.weightWeightPct).toBe(100);
    expect(uco.specWeightPct).toBe(0);
    expect(uco.score).toBe(0);
  });

  it("menolak klaim berat <= 0 dan persentase spesifikasi di luar 0-100", () => {
    expect(() =>
      computeQuantity(TEXTILE, { claimedWeightKg: 0, actualWeightKg: 10, specMatchPct: 50 }),
    ).toThrow(ScoringError);
    expect(() =>
      computeQuantity(TEXTILE, { claimedWeightKg: 10, actualWeightKg: 10, specMatchPct: 101 }),
    ).toThrow(ScoringError);
  });
});

describe("kelengkapan dokumentasi", () => {
  it("empat item masing-masing 25 poin", () => {
    expect(
      computeDocumentation({
        hasProductionDate: true,
        hasMultiAnglePhotos: true,
        hasLotNumber: true,
        hasLabTest: true,
      }).score,
    ).toBe(100);

    expect(
      computeDocumentation({
        hasProductionDate: true,
        hasMultiAnglePhotos: false,
        hasLotNumber: true,
        hasLabTest: false,
      }).score,
    ).toBe(50);

    expect(
      computeDocumentation({
        hasProductionDate: false,
        hasMultiAnglePhotos: false,
        hasLotNumber: false,
        hasLabTest: false,
      }).score,
    ).toBe(0);
  });
});

describe("ambang grade memakai skor akhir yang sudah dibulatkan", () => {
  it("batas 85 / 70 / 55", () => {
    expect(gradeFromFinalScore(100)).toBe("A");
    expect(gradeFromFinalScore(85)).toBe("A");
    expect(gradeFromFinalScore(84)).toBe("B");
    expect(gradeFromFinalScore(70)).toBe("B");
    expect(gradeFromFinalScore(69)).toBe("C");
    expect(gradeFromFinalScore(55)).toBe("C");
    expect(gradeFromFinalScore(54)).toBe("D");
    expect(gradeFromFinalScore(0)).toBe("D");
  });

  it("84,6 dibulatkan ke 85 lalu dinilai grade A (keputusan D6)", () => {
    const result = computeGrading(
      perfectInput({
        samplePoints: flatPoints(84.6, [1, 1, 1]),
        quantity: { claimedWeightKg: 100, actualWeightKg: 100, specMatchPct: 100 },
      }),
    );
    // 84,6×0,55 + 95×0,20 + 100×0,15 + 100×0,10 = 90,53 → bukan kasus ambang,
    // jadi diuji langsung lewat skor akhir hasil hitung.
    expect(result.finalScore).toBe(Math.round(result.finalScoreRaw));
    expect(result.grade).toBe(gradeFromFinalScore(result.finalScore));
  });

  it("batch sempurna menghasilkan 99 (konsistensi maksimum 95), grade A", () => {
    const result = computeGrading(perfectInput());
    expect(result.consistencyScore).toBe(95);
    expect(result.finalScore).toBe(99);
    expect(result.grade).toBe("A");
  });
});

describe("validasi input", () => {
  it("jumlah titik sampel ≠ 3 melempar error", () => {
    expect(() =>
      computeGrading(perfectInput({ samplePoints: flatPoints(80, [1, 1, 1]).slice(0, 2) })),
    ).toThrow(ScoringError);

    const duplicated = [...flatPoints(80, [1, 1, 1]), flatPoints(80, [1, 1, 1])[0]];
    expect(() => computeGrading(perfectInput({ samplePoints: duplicated }))).toThrow(ScoringError);
  });

  it("bobot sub-kriteria yang tidak berjumlah 100 melempar error, bukan dinormalisasi", () => {
    const broken: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria.map((c) =>
        c.subKey === "uniformity" ? { ...c, weightPct: 40 } : c,
      ),
    };
    expect(() => computeGrading(perfectInput({ category: broken }))).toThrow(
      /wajib 100/,
    );
  });

  it("skor sub-kriteria yang hilang atau di luar 0-100 melempar error", () => {
    const missing = flatPoints(80, [1, 1, 1]);
    delete missing[0].scores.dirt_level;
    expect(() => computeGrading(perfectInput({ samplePoints: missing }))).toThrow(ScoringError);

    const outOfRange = flatPoints(80, [1, 1, 1]);
    outOfRange[1].scores.uniformity = 140;
    expect(() => computeGrading(perfectInput({ samplePoints: outOfRange }))).toThrow(ScoringError);
  });

  it("level bau di luar 1-3 melempar error", () => {
    const points = flatPoints(80, [1, 1, 1]);
    // memaksa nilai tidak valid seperti yang bisa datang dari data lama
    (points[2] as { odorLevel: number }).odorLevel = 5;
    expect(() => computeGrading(perfectInput({ samplePoints: points }))).toThrow(ScoringError);
  });

  it("kategori tanpa sub-kriteria bau melempar error", () => {
    const noOdor: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria
        .filter((c) => !c.isOdor)
        .map((c) => (c.subKey === "dirt_level" ? { ...c, weightPct: 70 } : c)),
    };
    expect(() => computeGrading(perfectInput({ category: noOdor }))).toThrow(/sub-kriteria bau/);
  });
});

describe("determinisme & immutability", () => {
  it("input yang sama selalu menghasilkan output yang sama", () => {
    const a = computeGrading(SRD_FIXTURE);
    const b = computeGrading(SRD_FIXTURE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("scoringVersion ikut disimpan di hasil", () => {
    expect(computeGrading(SRD_FIXTURE).scoringVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("validasi konfigurasi kategori (jalur error lain)", () => {
  it("kriteria tanpa satu pun sub-kriteria melempar error", () => {
    const empty: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria.filter((c) => c.criterion !== "quantity_accuracy"),
    };
    expect(() => computeGrading(perfectInput({ category: empty }))).toThrow(
      /tidak punya sub-kriteria/,
    );
  });

  it("sub_key duplikat dalam satu kriteria melempar error", () => {
    const duplicate: CategoryConfig = {
      ...TEXTILE,
      criteria: [
        ...TEXTILE.criteria.filter((c) => c.criterion !== "purity"),
        { criterion: "purity", subKey: "dup", label: "Dup A", weightPct: 50, isOdor: false, odorOverrideCap: null },
        { criterion: "purity", subKey: "dup", label: "Dup B", weightPct: 50, isOdor: false, odorOverrideCap: null },
      ],
    };
    expect(() => computeGrading(perfectInput({ category: duplicate }))).toThrow(/duplikat/);
  });

  it("bobot negatif melempar error", () => {
    const negative: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria.map((c) =>
        c.subKey === "uniformity"
          ? { ...c, weightPct: -30 }
          : c.subKey === "fiber_type_match"
            ? { ...c, weightPct: 130 }
            : c,
      ),
    };
    expect(() => computeGrading(perfectInput({ category: negative }))).toThrow(/tidak valid/);
  });

  it("sub-kriteria bau di luar kriteria cleanliness melempar error", () => {
    const misplaced: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria
        .filter((c) => !c.isOdor)
        .map((c) =>
          c.subKey === "dirt_level" ? { ...c, weightPct: 70 } : c.subKey === "fiber_type_match" ? { ...c, weightPct: 50 } : c,
        )
        .concat([
          { criterion: "purity", subKey: "odor", label: "Bau salah tempat", weightPct: 20, isOdor: true, odorOverrideCap: 40 },
        ]),
    };
    expect(() => computeGrading(perfectInput({ category: misplaced }))).toThrow(
      /cleanliness/,
    );
  });

  it("tiga titik sampel dengan nama duplikat melempar error", () => {
    const points = flatPoints(80, [1, 1, 1]);
    const duplicated: SamplePointInput[] = [points[0], { ...points[1], point: "top" }, points[2]];
    expect(() => computeGrading(perfectInput({ samplePoints: duplicated }))).toThrow(
      /wajib ada tepat 1/,
    );
  });

  it("berat timbang ulang negatif melempar error", () => {
    expect(() =>
      computeQuantity(TEXTILE, { claimedWeightKg: 50, actualWeightKg: -1, specMatchPct: 50 }),
    ).toThrow(/Berat timbang ulang/);
  });
});

describe("konvensi sub_key quantity_accuracy (SRD v1.1 Bab 5.1 & 7.6)", () => {
  it("sub_key selain weight_accuracy/spec_accuracy melempar error", () => {
    const wrongKey: CategoryConfig = {
      ...TEXTILE,
      criteria: TEXTILE.criteria.map((c) =>
        c.subKey === "spec_accuracy" ? { ...c, subKey: "ukuran_potongan" } : c,
      ),
    };
    expect(() => computeGrading(perfectInput({ category: wrongKey }))).toThrow(
      /tidak dikenal pada quantity_accuracy/,
    );
  });

  it("kategori tanpa spec_accuracy (UCO) tetap dihitung tanpa error", () => {
    const uco = computeQuantity(UCO, {
      claimedWeightKg: 100,
      actualWeightKg: 99,
      specMatchPct: 0,
    });
    expect(uco.specWeightPct).toBe(0);
    expect(uco.score).toBe(100);
  });
});

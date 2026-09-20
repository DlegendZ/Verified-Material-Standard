/**
 * Fixture bersama untuk unit test scoring engine.
 *
 * Kasus utama diambil persis dari grading-system.md Section 10 /
 * SRD Bab 7.8 (regression fixture wajib).
 */
import { findSeedCategory } from "@/lib/categories";
import type { GradingInput, SamplePointInput } from "../types";

export const TEXTILE = findSeedCategory("textile");
export const UCO = findSeedCategory("uco");

/** Kasus "Sentosa Textile" — klaim 50 kg, hasil yang diharapkan: 64 / grade C. */
export const SRD_FIXTURE_POINTS: SamplePointInput[] = [
  {
    point: "top",
    odorLevel: 1,
    scores: { fiber_type_match: 90, uniformity: 80, dirt_level: 90, fraying_level: 85, odor: 95 },
  },
  {
    point: "middle",
    odorLevel: 1,
    scores: { fiber_type_match: 88, uniformity: 85, dirt_level: 85, fraying_level: 80, odor: 90 },
  },
  {
    // Bau level 3 → override: dirt_level & fraying_level tetap disimpan sebagai
    // data mentah tapi tidak ikut dihitung sama sekali.
    point: "bottom",
    odorLevel: 3,
    scores: { fiber_type_match: 70, uniformity: 60, dirt_level: 80, fraying_level: 75, odor: 10 },
  },
];

export const SRD_FIXTURE: GradingInput = {
  category: TEXTILE,
  samplePoints: SRD_FIXTURE_POINTS,
  quantity: { claimedWeightKg: 50, actualWeightKg: 47, specMatchPct: 75 },
  documentation: {
    hasProductionDate: true,
    hasMultiAnglePhotos: false,
    hasLotNumber: true,
    hasLabTest: false,
  },
};

/** Semua sub-kriteria bernilai `value` pada ketiga titik, level bau bisa diatur. */
export function flatPoints(value: number, odorLevels: [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3]): SamplePointInput[] {
  const keys = ["fiber_type_match", "uniformity", "dirt_level", "fraying_level", "odor"];
  const scores = Object.fromEntries(keys.map((k) => [k, value]));
  return [
    { point: "top", odorLevel: odorLevels[0], scores: { ...scores } },
    { point: "middle", odorLevel: odorLevels[1], scores: { ...scores } },
    { point: "bottom", odorLevel: odorLevels[2], scores: { ...scores } },
  ];
}

/** Input lengkap dengan kuantitas & dokumentasi sempurna — memudahkan isolasi variabel. */
export function perfectInput(overrides: Partial<GradingInput> = {}): GradingInput {
  return {
    category: TEXTILE,
    samplePoints: flatPoints(100, [1, 1, 1]),
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

import { z } from "zod";
import type { GradingResult } from "./scoring";
const number = z.number().finite().catch(0);
const nullableNumber = z.number().finite().nullable().catch(null);
const method = z.enum(["moisture_meter", "touch_estimate"]);
const contribution = z.object({
  criterion: z.enum(["purity", "cleanliness", "quantity_accuracy"]),
  subKey: z.string(),
  label: z.string(),
  weightPct: number,
  rawScore: nullableNumber,
  contribution: number,
  ignoredByOverride: z.boolean().catch(false),
  method: z.enum(["scale", "unit_count"]).catch("scale"),
  unitsPassed: nullableNumber,
  unitsChecked: nullableNumber,
  passPct: nullableNumber,
  measurementMethod: method.nullable().catch(null),
});
const point = z.object({
  point: z.enum(["top", "middle", "bottom"]),
  odorLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  purity: number,
  cleanliness: number,
  cleanlinessOverridden: z.boolean().catch(false),
  cleanlinessOverrideCap: nullableNumber,
  contributions: z.array(contribution).catch([]),
});
const level = z.enum(["small", "medium", "large"]).catch("small");
const consistency = z.object({
  puritySpread: number,
  cleanlinessSpread: number,
  purityLevel: level,
  cleanlinessLevel: level,
  appliedLevel: level,
  score: number,
});
const quantity = z.object({
  deviationPct: number,
  weightDeviationPct: number,
  countChecks: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        claimed: number,
        observed: number,
        deviationPct: number,
      }),
    )
    .catch([]),
  deviationSource: z.string().catch("weight"),
  weightScore: number,
  specMatchPct: nullableNumber,
  specUnitsPassed: nullableNumber,
  specUnitsChecked: nullableNumber,
  specScore: number,
  weightWeightPct: number,
  specWeightPct: number,
  score: number,
});
const documentation = z.object({
  score: number,
  items: z
    .array(
      z.object({
        key: z.enum([
          "hasProductionDate",
          "hasMultiAnglePhotos",
          "hasLotNumber",
          "hasLabTest",
        ]),
        label: z.string(),
        points: number,
      }),
    )
    .catch([]),
});
const final = z.object({
  key: z.enum([
    "purity",
    "cleanliness",
    "consistency",
    "quantity",
    "documentation",
  ]),
  label: z.string(),
  score: number,
  weightPct: number,
  contribution: number,
});
function record(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}
/** Tidak menghitung ulang skor sertifikat lama; hanya melengkapi field render v2. */
export function normalizeBreakdown(
  raw: unknown,
  scoringVersion: string,
): GradingResult["breakdown"] {
  const data = record(raw);
  const q = record(data.quantity);
  const points = Array.isArray(data.samplePoints)
    ? data.samplePoints.flatMap((p) => {
        const parsed = point.safeParse(p);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const rows = Array.isArray(data.final)
    ? data.final.flatMap((r) => {
        const parsed = final.safeParse(r);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const profile = z
    .object({
      code: z.string(),
      unitsPerPoint: z.number().int().positive(),
      claimMode: z.enum(["bundle", "weight"]),
    })
    .nullable()
    .catch(null);
  return {
    samplingProfile: scoringVersion.startsWith("1.")
      ? null
      : profile.parse(data.samplingProfile),
    samplePoints: points,
    final: rows,
    consistency: consistency.parse(record(data.consistency)),
    quantity: quantity.parse({
      ...q,
      weightDeviationPct: q.weightDeviationPct ?? q.deviationPct,
    }),
    documentation: documentation.parse(record(data.documentation)),
  };
}

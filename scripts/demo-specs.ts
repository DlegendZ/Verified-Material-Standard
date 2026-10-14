/** Data fiktif Lampiran B; tidak membuka client/DB, aman diimpor unit test. */
import type {
  DocumentationInput,
  Grade,
  MeasurementMethod,
  SamplePointInput,
  UnitCount,
} from "../lib/scoring";
import type { ClaimedSpecDetail } from "../lib/validation/schemas";
export interface DemoBatchSpec {
  batchCode: string;
  profileCode: "bundled_sticks" | "loose_offcuts";
  declaredMaterialType: string;
  claimedWeightKg: number;
  claimedSpecDetail: ClaimedSpecDetail;
  productionDate: string;
  lotNumber: string;
  description: string;
  samplePoints: SamplePointInput[];
  quantity: {
    actualWeightKg: number;
    countChecks: { key: string; observed: number }[];
    specUnits: UnitCount;
  };
  documentation: DocumentationInput;
  weighingMoistureNote: string;
  outcome: "issued" | "revoked" | "not_certified" | "rejected_gate";
  expired?: boolean;
  revokeReason?: string;
  gate?: {
    nonB3Pass: boolean;
    originExistsPass: boolean;
    originAuthenticPass: boolean;
    notes: string;
  };
  expected: {
    purity: number;
    cleanliness: number;
    consistency: number;
    quantity: number;
    documentation: number;
    raw: number;
    score: number;
    grade: Grade;
  } | null;
}
function points(
  checked: number,
  rows: [number, number, number, number, number, number, number, 1 | 2 | 3][],
  method: MeasurementMethod,
): SamplePointInput[] {
  return (["top", "middle", "bottom"] as const).map((point, i) => {
    const [
      species,
      uniformity,
      biological,
      foreign,
      moisture,
      physical,
      odor,
      odorLevel,
    ] = rows[i];
    return {
      point,
      odorLevel,
      scores: { species_match: species, uniformity, moisture, odor },
      unitCounts: {
        biological_damage: { passed: biological, checked },
        foreign_contaminant: { passed: foreign, checked },
        physical_defect: { passed: physical, checked },
      },
      measurementMethods: { moisture: method },
    };
  });
}
const counts = (...observed: number[]) =>
  ["top", "middle", "bottom"].map((p, i) => ({
    key: `units_per_bundle_${p}`,
    observed: observed[i],
  }));
const bundle = (
  bundleCount: number,
  unitsPerBundle: number,
  crossSectionWidthCm: number,
  crossSectionThicknessCm: number,
  lengthCm: number,
): ClaimedSpecDetail => ({
  claimMode: "bundle",
  bundleCount,
  unitsPerBundle,
  crossSectionWidthCm,
  crossSectionThicknessCm,
  lengthCm,
  crossSectionToleranceCm: 0.2,
  lengthToleranceCm: 1,
});
const docs = (
  date: boolean,
  photos: boolean,
  lot: boolean,
  lab: boolean,
): DocumentationInput => ({
  hasProductionDate: date,
  hasMultiAnglePhotos: photos,
  hasLotNumber: lot,
  hasLabTest: lab,
});
const baseB: DemoBatchSpec = {
  batchCode: "DEMO-B-002",
  profileCode: "bundled_sticks",
  declaredMaterialType: "Pinus",
  claimedWeightKg: 400,
  claimedSpecDetail: bundle(20, 20, 3, 4, 100),
  productionDate: "2026-10-01",
  lotNumber: "",
  description: "Contoh perhitungan grading-system §10 (kasus fiktif).",
  samplePoints: points(
    10,
    [
      [92, 85, 10, 10, 90, 8, 95, 1],
      [90, 80, 9, 8, 85, 7, 90, 1],
      [80, 70, 8, 10, 55, 7, 70, 2],
    ],
    "touch_estimate",
  ),
  quantity: {
    actualWeightKg: 384,
    countChecks: counts(20, 19, 20),
    specUnits: { passed: 25, checked: 30 },
  },
  documentation: docs(true, true, false, false),
  weighingMoistureNote: "",
  outcome: "issued",
  expected: {
    purity: 84.633333,
    cleanliness: 84.75,
    consistency: 70,
    quantity: 78,
    documentation: 50,
    raw: 77.2775,
    score: 77,
    grade: "B",
  },
};
export const DEMO_SPECS: DemoBatchSpec[] = [
  {
    batchCode: "DEMO-A-001",
    profileCode: "bundled_sticks",
    declaredMaterialType: "Jati",
    claimedWeightKg: 300,
    claimedSpecDetail: bundle(20, 15, 4, 6, 120),
    productionDate: "2026-09-28",
    lotNumber: "LOT-KY-0928",
    description: "Sisa potongan rangka kursi, sudah disortir.",
    samplePoints: points(
      10,
      [
        [95, 92, 10, 10, 92, 9, 95, 1],
        [94, 90, 10, 10, 90, 10, 95, 1],
        [93, 90, 10, 9, 88, 9, 92, 1],
      ],
      "moisture_meter",
    ),
    quantity: {
      actualWeightKg: 297,
      countChecks: counts(15, 15, 15),
      specUnits: { passed: 29, checked: 30 },
    },
    documentation: docs(true, true, true, true),
    weighingMoistureNote: "Moisture meter 12–14%",
    outcome: "issued",
    expected: {
      purity: 93,
      cleanliness: 97.3,
      consistency: 95,
      quantity: 100,
      documentation: 100,
      raw: 96.225,
      score: 96,
      grade: "A",
    },
  },
  baseB,
  {
    ...baseB,
    batchCode: "DEMO-C-003",
    description: "Variasi §10: ikat dasar berbau jamur menyengat.",
    samplePoints: baseB.samplePoints.map((p) =>
      p.point === "bottom"
        ? { ...p, odorLevel: 3, scores: { ...p.scores, odor: 15 } }
        : p,
    ),
    expected: {
      purity: 84.633333,
      cleanliness: 73.166667,
      consistency: 40,
      quantity: 78,
      documentation: 50,
      raw: 68.381667,
      score: 68,
      grade: "C",
    },
  },
  {
    batchCode: "DEMO-B-004",
    profileCode: "loose_offcuts",
    declaredMaterialType: "Mahoni",
    claimedWeightKg: 150,
    claimedSpecDetail: {
      claimMode: "weight",
      lengthMinCm: 15,
      lengthMaxCm: 40,
      lengthToleranceCm: 1,
      crossSectionNote: "tebal 2–4 cm",
    },
    productionDate: "2026-09-20",
    lotNumber: "LOT-KY-0920",
    description:
      "Potongan pendek lepas; sertifikat kemudian dicabut karena perubahan kondisi.",
    samplePoints: points(
      20,
      [
        [88, 82, 19, 18, 80, 16, 90, 1],
        [86, 80, 18, 16, 78, 15, 88, 1],
        [85, 78, 17, 18, 75, 14, 85, 1],
      ],
      "touch_estimate",
    ),
    quantity: {
      actualWeightKg: 146,
      countChecks: [],
      specUnits: { passed: 52, checked: 60 },
    },
    documentation: docs(true, true, true, false),
    weighingMoistureNote: "",
    outcome: "revoked",
    revokeReason:
      "Batch terkena hujan di gudang sebelum terjual sehingga kadar kelembapan berubah signifikan. Sertifikat lama tidak berlaku; batch wajib disampling ulang dari awal (grading-system §13 poin 4).",
    expected: {
      purity: 84.433333,
      cleanliness: 86.266667,
      consistency: 70,
      quantity: 78,
      documentation: 75,
      raw: 80.096667,
      score: 80,
      grade: "B",
    },
  },
  {
    batchCode: "DEMO-E-005",
    profileCode: "bundled_sticks",
    declaredMaterialType: "Pinus",
    claimedWeightKg: 250,
    claimedSpecDetail: bundle(12, 20, 2, 4, 80),
    productionDate: "2026-08-10",
    lotNumber: "LOT-KY-0810",
    description: "Contoh sertifikat yang masa berlakunya sudah lewat.",
    samplePoints: points(
      10,
      [
        [90, 84, 10, 9, 85, 8, 90, 1],
        [88, 82, 9, 9, 82, 8, 88, 1],
        [86, 80, 9, 8, 80, 7, 85, 2],
      ],
      "moisture_meter",
    ),
    quantity: {
      actualWeightKg: 244,
      countChecks: counts(20, 20, 19),
      specUnits: { passed: 26, checked: 30 },
    },
    documentation: docs(true, true, true, false),
    weighingMoistureNote: "",
    outcome: "issued",
    expired: true,
    expected: {
      purity: 86.2,
      cleanliness: 89.466667,
      consistency: 70,
      quantity: 78,
      documentation: 75,
      raw: 81.426667,
      score: 81,
      grade: "B",
    },
  },
  {
    batchCode: "DEMO-D-006",
    profileCode: "loose_offcuts",
    declaredMaterialType: "Meranti",
    claimedWeightKg: 200,
    claimedSpecDetail: {
      claimMode: "weight",
      lengthMinCm: 10,
      lengthMaxCm: 30,
      lengthToleranceCm: 1,
    },
    productionDate: "",
    lotNumber: "",
    description: "Batch belum disortir, dua titik berbau parah.",
    samplePoints: points(
      20,
      [
        [60, 45, 9, 12, 50, 10, 20, 3],
        [65, 50, 13, 14, 55, 12, 70, 2],
        [45, 35, 7, 10, 40, 8, 10, 3],
      ],
      "touch_estimate",
    ),
    quantity: {
      actualWeightKg: 171,
      countChecks: [],
      specUnits: { passed: 24, checked: 60 },
    },
    documentation: docs(false, false, false, false),
    weighingMoistureNote: "",
    outcome: "not_certified",
    expected: {
      purity: 52.666667,
      cleanliness: 44.916667,
      consistency: 70,
      quantity: 8,
      documentation: 0,
      raw: 42.229167,
      score: 42,
      grade: "D",
    },
  },
  {
    batchCode: "DEMO-GATE-007",
    profileCode: "bundled_sticks",
    declaredMaterialType: "Pinus",
    claimedWeightKg: 180,
    claimedSpecDetail: bundle(10, 20, 3, 4, 100),
    productionDate: "2026-09-30",
    lotNumber: "LOT-KY-0930",
    description: "Ditolak di gerbang wajib berdasarkan kebijakan ketat P12.",
    samplePoints: [],
    quantity: {
      actualWeightKg: 0,
      countChecks: [],
      specUnits: { passed: 0, checked: 30 },
    },
    documentation: docs(false, false, false, false),
    weighingMoistureNote: "",
    outcome: "rejected_gate",
    expected: null,
    gate: {
      nonB3Pass: false,
      originExistsPass: true,
      originAuthenticPass: true,
      notes:
        "Bau pengawet kimia menyengat dan permukaan kayu kehijauan khas kayu yang diawetkan. Sesuai kebijakan pilot, kayu yang diawetkan kimia tidak diterima. Proses dihentikan.",
    },
  },
];

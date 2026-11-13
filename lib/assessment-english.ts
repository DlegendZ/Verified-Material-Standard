import { GRADER_TEXT, REVISION_TEXT } from "./text";

export const samplePointsEn = {
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
};
export const chemicalGateEn =
  "Open a bundle or take a handful of offcuts from each of the three points. If any sampled piece has chemical treatment, chemical odor, or traces of paint, glue, varnish, solvent, or oil, reject the entire batch at the Non-B3 gate.";
export const gatesEn = [
  {
    key: "nonB3Pass",
    label: "Non-B3 (non-hazardous)",
    hint: "Hazardous waste is outside VMS scope.",
  },
  {
    key: "originExistsPass",
    label: "Proof of origin provided",
    hint: "Look for an official invoice or delivery note from the factory.",
  },
  {
    key: "originAuthenticPass",
    label: "Proof of origin is authentic",
    hint: "Check the letterhead and compare the document with the registered factory details.",
  },
] as const;
export const declarationsEn = {
  sourceIsProductionResidue:
    "This material is production residue from my factory or business. It is not mined material or demolition debris.",
  noChemicalTreatment:
    "The wood has not been chemically treated and has no trace of paint, glue, varnish, solvents, or oil. A trace on even one stick disqualifies the entire batch. Embedded nails or screws are assessed separately.",
  singleForm:
    "This batch contains only one form. It does not mix bundled sticks with loose offcuts, chips, or sawdust.",
};
export const assessmentEn = {
  ...GRADER_TEXT,
  claimedCount: (n: number) => `Declared: ${n}`,
  countClaim: "Declared",
  countObserved: "Observed",
  deviation: "Difference",
  applied: "Applied",
  quantityScore: "Quantity accuracy score",
  dimensionScore: "Dimension accuracy score",
  decrease: (label: string) => `Decrease passed units for ${label}`,
  increase: (label: string) => `Increase passed units for ${label}`,
  pointPhoto: "Take or upload a photo of this point",
  documentationHint:
    "Each item is worth 25 points. Check only the evidence available for this batch.",
  overrideNotice: (cap: number) =>
    `Level 3 odor sets the cleanliness score to ${cap}. Other cleanliness scores at this point are optional and do not count.`,
  scoreTitle: "Score explanation",
  pointScoreTitle: "Score by sample point",
  photoTitle: (point: string) => `Photo: ${point}`,
  speciesPurity: "Purity and composition",
  cleanliness: "Cleanliness and contamination",
  documentationItems: [
    { key: "hasProductionDate" as const, label: "Production date recorded" },
    { key: "hasMultiAnglePhotos" as const, label: "Multi-angle photos" },
    { key: "hasLotNumber" as const, label: "Lot or traceability number" },
    {
      key: "hasLabTest" as const,
      label: "Additional test results (e.g. lab results)",
    },
  ],
  countChecksRequired:
    "Enter the number of sticks once for each of the top, middle, and bottom bundles.",
  gateNotes: "Notes",
  gateNotesHint: "Enter at least 10 characters when a gate check fails.",
  gateSave: "Save gate checks",
  gateSaving: "Saving…",
  gateReminder:
    "Check only items that passed. A failed gate stops assessment; the batch gets no score, grade, or certificate.",
  incompletePoint: "Incomplete",
  completePoint: "Complete",
  steps: ["Sampling", "Quantity", "Documentation", "Preview"],
  samplingGuide: "Sampling guide",
  inspect: (n: number, units: string) => `Inspect ${n} ${units} per point`,
  unitsPassed: "Units passed",
  unitsChecked: "Units checked",
  notFilled: "Not entered",
  passed: "passed",
  outOf: "out of",
  moistureMeter: "Moisture meter",
  touchEstimate: "Estimate by touch",
  method: "Moisture measurement method",
  weighingMoistureNote: "Moisture notes while weighing",
  weighingMoistureHint: "Moisture affects wood weight. Record its condition.",
  actualWeight: "Measured weight (kg)",
  dimensionUnits: "Sample units within dimension tolerance",
  bundleObserved: (point: string) =>
    `Number of sticks in the ${point.toLowerCase()} bundle`,
  bundleCountObserved: "Counted bundles (optional)",
  previewError: "Complete sampling and quantity inputs to preview the score.",
  calculationError: "Could not calculate the score. Check the inputs.",
  submit: "Submit assessment",
  submitting: "Submitting…",
  unitSummary: (n: number, total: number, pct: string, score: string) =>
    `${n}/${total} passed (${pct}%) → ${score}`,
  notes: "Sample notes",
  quantityNotes: "Quantity notes",
  formulaVersion: "Scoring version",
  weightDeviation: "Weight difference",
  countDeviation: "Count difference",
  maxDeviation: "Largest difference applied",
  quantityDetail: "Quantity details",
  overrideEmpty: "Not entered (odor override)",
};

export const nonB3En = {
  ...REVISION_TEXT,
  nonB3FindingButton: "Reject batch — Non-B3 finding",
  nonB3FindingTitle: "Reject this batch for a Non-B3 finding?",
  nonB3FindingBody:
    "Reject the batch if you find chemical treatment, chemical odor, or any trace of paint, glue, varnish, solvent, or oil. There will be no score or certificate, and the unsent assessment will be discarded.",
  nonB3FindingPlaceholder:
    "Example: Two sticks in the middle bundle had glue residue on one side.",
  nonB3FindingConfirm: "Yes, reject batch",
  nonB3FindingCancel: "Cancel",
  nonB3ReconfirmLabel:
    "I found no chemical treatment, chemical odor, or traces of paint, glue, varnish, solvents, or oil on the sampled pieces.",
};

export const criteriaHelpEn: Record<string, readonly [string, string]> = {
  species_match: [
    "Wood species matches the claim",
    "Compare with reference samples and origin documents. Visual identification is not conclusive.",
  ],
  uniformity: [
    "Species and size uniformity",
    "Check whether species, color, and size are consistent at this sampling point.",
  ],
  biological_damage: [
    "Biological damage",
    "Fail units with rot, mold, blue stain, termite holes, or termite dust.",
  ],
  foreign_contaminant: [
    "Embedded nails, screws, or metal",
    "Fail units with embedded metal. Reject the entire batch at the Non-B3 gate if you find chemical residue.",
  ],
  moisture: [
    "Moisture",
    "Use a moisture meter if available, otherwise estimate by touch. Record the method.",
  ],
  physical_defect: [
    "Physical defects",
    "Fail units with cracks, splits, warping, loose or large knots, or uneven edges.",
  ],
  odor: [
    "Odor",
    "Level 3 overrides cleanliness at this point. Chemical odor fails the Non-B3 gate.",
  ],
  weight_accuracy: [
    "Quantity accuracy",
    "Reweigh the batch. For bundle claims, count sticks as well. Use the largest difference.",
  ],
  spec_accuracy: [
    "Dimension accuracy",
    "Check the percentage of sampled units within the declared tolerances.",
  ],
};

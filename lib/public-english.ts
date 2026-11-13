import type { Locale } from "./locale";
import type { GradeDb } from "./types/db";

const categoryNames: Record<string, string> = {
  solid_wood: "Solid wood",
  metal: "Iron & metal",
  glass: "Glass",
  ceramic: "Ceramics",
  textile: "Textiles",
  plastic: "Plastics",
  paper: "Paper",
  biomass: "Biomass",
  uco: "Used cooking oil",
};
const profileNames: Record<string, string> = {
  bundled_sticks: "Bundled sticks",
  loose_offcuts: "Loose short offcuts",
};

export function categoryName(locale: Locale, code: string, name: string) {
  return locale === "en" && Object.hasOwn(categoryNames, code)
    ? categoryNames[code]
    : name;
}

export function profileName(locale: Locale, code: string, name: string) {
  return locale === "en" && Object.hasOwn(profileNames, code)
    ? profileNames[code]
    : name;
}

export const gradeNamesEn: Record<GradeDb, string> = {
  A: "Premium",
  B: "Standard",
  C: "Economy",
  D: "Not certified",
};
export const gradeDescriptionsEn: Record<GradeDb, string> = {
  A: "Minimal contamination and highly consistent material for production that requires uniformity.",
  B: "Suitable for general production that can tolerate small variations.",
  C: "More mixed or variable material for uses that do not require close tolerances.",
  D: "Below the certification threshold. Sort or reprocess the batch before applying again.",
};
export const woodGradesEn: Record<GradeDb, string> = {
  A: "Mostly intact, consistent units with little biological damage or contamination. Suitable for higher-value reuse, such as crafts or small furniture.",
  B: "Suitable for reuse with light sorting: remove defective units or embedded nails.",
  C: "Requires extensive sorting, or only a small portion is usable. Usually better suited to lower-value reuse.",
  D: "Not certified. Sorting or reprocessing is recommended.",
};
export const gradeNoteEn =
  "These examples describe possible uses; they are not guarantees or structural strength tests.";

export const stepsEn = [
  {
    title: "Register a batch",
    body: "The factory or workshop submits one lot of offcuts with its form, wood species, weight, dimensions, photos, and proof of origin.",
  },
  {
    title: "Sample three points",
    body: "A grader opens bundles or collects loose offcuts from the top, middle, and bottom of the stack, then examines the individual pieces.",
  },
  {
    title: "Share the result",
    body: "An administrator reviews the assessment and issues a certificate with a QR code. Buyers can check it without an account.",
  },
];

export const criteriaEn = [
  {
    weight: 30,
    label: "Purity",
    hint: "Checks declared material type and uniformity.",
  },
  {
    weight: 25,
    label: "Cleanliness",
    hint: "Assesses biological damage, embedded contaminants, moisture, physical defects, and odor.",
  },
  {
    weight: 20,
    label: "Consistency",
    hint: "Calculated from the spread between sampling points.",
  },
  {
    weight: 15,
    label: "Quantity and specification accuracy",
    hint: "Compares actual weight, counts, and dimensions with the declared values.",
  },
  {
    weight: 10,
    label: "Documentation",
    hint: "Checks production date, multi-angle photos, lot traceability, and lab results.",
  },
];

export function faqItemsEn(duration: string) {
  return [
    {
      question: "Who verifies material quality?",
      answer:
        "A VMS grader visits the site and scores physical samples from the top, middle, and bottom of the stack. A VMS administrator reviews the assessment before issuing a certificate.",
    },
    {
      question: "Do I need an account to check a certificate?",
      answer:
        "No. Anyone with its link or QR code can open the verification page. You can also enter the certificate number on the homepage.",
    },
    {
      question: "How do I use a certificate in a marketplace listing?",
      answer:
        "Paste the grade, certificate number, and verification link, or include the QR code in your listing. Buyers can open or scan it directly. VMS has no marketplace API integration.",
    },
    {
      question: "What do grades A, B, C, and D mean?",
      answer:
        "The final score determines the grade: A 85–100 (Premium), B 70–84 (Standard), C 55–69 (Economy), and D below 55 (not certified). For solid wood:",
      gradeTable: true,
    },
    {
      question: "How long is a certificate valid?",
      answer: `Solid wood certificates are valid for ${duration} from issue. This is a conservative pilot estimate for tropical storage. A significant change, such as rain damage or mixing with other material, requires revocation and a fresh assessment.`,
    },
    {
      question: "Why does VMS not recommend prices?",
      answer:
        "An independent grade describes material condition. The seller and buyer agree on the price.",
    },
    {
      question: "What if a factory disagrees with a grade?",
      answer:
        "It can request one free resampling by a different grader within three business days after the certificate is issued.",
      objectionLink: true,
    },
    {
      question: "How long does the process take?",
      answer: "The target is 24 hours from sampling to certificate issue.",
    },
    {
      question: "Which materials can be assessed?",
      answer:
        "The pilot covers solid wood in bundled sticks or loose short offcuts. Iron and metal, glass, and ceramics are planned. Only production residues are accepted. Hazardous waste, mined material, and demolition debris are excluded. The pilot rejects chemically treated wood and any traces of paint, glue, varnish, solvents, or oil.",
    },
    {
      question: "How accurate is the defect assessment?",
      answer:
        "Defect thresholds and dimension tolerances are preliminary and have not yet been validated by wood specialists. VMS samples three points. It does not inspect every unit or test structural strength.",
    },
  ];
}

export const objectionEn = {
  title: "Appeals and reverification",
  badge: "Preview — submissions are not open in the app",
  introduction: "Here is what a factory can do if it disagrees with a grade.",
  steps: [
    {
      title: "Request a review",
      body: "A factory can request one free resampling within three business days after issue, provided the physical batch has not changed significantly.",
    },
    {
      title: "Resample with a different grader",
      body: "A different grader takes fresh samples at different points.",
    },
    {
      title: "The second result is final",
      body: "A batch can only be appealed once. Both results are kept for audit.",
    },
    {
      title: "If the batch changes",
      body: "If the condition changes significantly before sale, for example after rain or mixing, the certificate is no longer valid and the batch must be assessed again.",
    },
  ],
  previewTitle: "Request form preview",
  reason: "Reason for appeal",
  confirmation:
    "The physical condition of the batch has not changed since sampling",
  submit: "Request resampling (coming soon)",
  closing: "For now, contact a VMS administrator to appeal.",
};

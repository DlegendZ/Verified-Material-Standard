"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  GRADE_DESCRIPTION,
  GRADE_MEANING,
  PUBLIC_TEXT,
  PUBLIC_CATEGORY_FALLBACK,
  REVISION_TEXT,
} from "@/lib/text";
import type { GradeDb } from "@/lib/types/db";
import { useLocale } from "./locale-provider";
import {
  gradeNamesEn,
  gradeDescriptionsEn,
  woodGradesEn,
  gradeNoteEn,
} from "@/lib/public-english";

const GRADES: { grade: GradeDb; range: string; start: number; end: number }[] =
  [
    { grade: "A", range: "85–100", start: 85, end: 100 },
    { grade: "B", range: "70–84", start: 70, end: 85 },
    { grade: "C", range: "55–69", start: 55, end: 70 },
    { grade: "D", range: "di bawah 55", start: 0, end: 55 },
  ];

export function GradeExplorer({
  gradeMeanings,
}: {
  gradeMeanings?: Record<GradeDb, string> | null;
}) {
  const en = useLocale() === "en";
  const names = en ? gradeNamesEn : GRADE_MEANING;
  const meanings = en
    ? woodGradesEn
    : (gradeMeanings ??
      PUBLIC_CATEGORY_FALLBACK.find((c) => c.code === "solid_wood")
        ?.grade_meanings);
  const [selectedGrade, setSelectedGrade] = useState<GradeDb>("B");
  const selected = GRADES.find((item) => item.grade === selectedGrade)!;

  return (
    <div className="grade-explorer">
      <div
        className="grade-selector"
        aria-label={en ? "Explore material grades" : "Jelajahi grade material"}
      >
        {GRADES.map(({ grade, range }) => (
          <button
            key={grade}
            type="button"
            aria-pressed={selectedGrade === grade}
            onClick={() => setSelectedGrade(grade)}
            className="grade-option"
          >
            <span
              className={`grade-option-letter grade-${grade.toLowerCase()}`}
            >
              {grade}
            </span>
            <span className="grade-option-copy">
              <strong>{names[grade]}</strong>
              <small>{en && grade === "D" ? "below 55" : range}</small>
            </span>
            <ArrowUpRight className="grade-option-arrow size-4" aria-hidden />
          </button>
        ))}
      </div>
      <div
        className={`grade-display grade-display-${selectedGrade.toLowerCase()}`}
        aria-live="polite"
      >
        <div className="grade-display-top">
          <span>VMS / GRADE INDEX</span>
          <span>0—100</span>
        </div>
        <div key={selectedGrade} className="grade-display-content">
          <span className="grade-display-letter" aria-hidden>
            {selectedGrade}
          </span>
          <div className="grade-display-copy">
            <span className="grade-display-label">GRADE {selectedGrade}</span>
            <h3>{names[selectedGrade]}</h3>
            <p>
              {(en ? gradeDescriptionsEn : GRADE_DESCRIPTION)[selectedGrade]}
            </p>
            {meanings ? (
              <div className="mt-5 border-t border-current/20 pt-4">
                <p className="text-sm font-semibold">
                  {en ? "For solid wood" : PUBLIC_TEXT.woodGradeTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  {meanings[selectedGrade]}
                </p>
                <p className="mt-3 text-xs leading-relaxed opacity-90">
                  {en ? gradeNoteEn : REVISION_TEXT.gradeMeaningNote}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="grade-display-bottom">
          <div className="flex items-end justify-between gap-4">
            <span>{en ? "SCORE RANGE" : "RENTANG SKOR"}</span>
            <strong>
              {en && selectedGrade === "D" ? "below 55" : selected.range}
            </strong>
          </div>
          <div className="grade-meter">
            <span
              style={{
                left: `${selected.start}%`,
                width: `${selected.end - selected.start}%`,
              }}
            />
          </div>
          <div className="grade-meter-scale">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

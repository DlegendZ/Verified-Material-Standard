"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { GRADE_DESCRIPTION, GRADE_MEANING } from "@/lib/text";
import type { GradeDb } from "@/lib/types/db";

const GRADES: { grade: GradeDb; range: string; start: number; end: number }[] =
  [
    { grade: "A", range: "85–100", start: 85, end: 100 },
    { grade: "B", range: "70–84", start: 70, end: 85 },
    { grade: "C", range: "55–69", start: 55, end: 70 },
    { grade: "D", range: "di bawah 55", start: 0, end: 55 },
  ];

export function GradeExplorer() {
  const [selectedGrade, setSelectedGrade] = useState<GradeDb>("B");
  const selected = GRADES.find((item) => item.grade === selectedGrade)!;

  return (
    <div className="grade-explorer">
      <div className="grade-selector" aria-label="Jelajahi grade material">
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
              <strong>{GRADE_MEANING[grade]}</strong>
              <small>{range}</small>
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
            <h3>{GRADE_MEANING[selectedGrade]}</h3>
            <p>{GRADE_DESCRIPTION[selectedGrade]}</p>
          </div>
        </div>
        <div className="grade-display-bottom">
          <div className="flex items-end justify-between gap-4">
            <span>RENTANG SKOR</span>
            <strong>{selected.range}</strong>
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

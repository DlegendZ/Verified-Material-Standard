import { GRADE_MEANING, GRADE_TABLE_TEXT, REVISION_TEXT } from "@/lib/text";
import type { GradeDb } from "@/lib/types/db";
import type { Locale } from "@/lib/locale";
import { gradeNamesEn, gradeNoteEn } from "@/lib/public-english";

export function GradeMeaningTable({
  categoryName,
  meanings,
  grade,
  locale = "id",
}: {
  categoryName: string;
  meanings: Record<GradeDb, string> | null | undefined;
  grade?: GradeDb;
  locale?: Locale;
}) {
  const en = locale === "en";
  if (!meanings) return null;
  return (
    <div className="min-w-0 space-y-3">
      <h3 className="text-base font-semibold text-ink">
        {en
          ? `What the grade means for ${categoryName}`
          : REVISION_TEXT.gradeMeaningTitle(categoryName)}
      </h3>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className="p-3">
                {GRADE_TABLE_TEXT.grade}
              </th>
              <th scope="col" className="p-3">
                {en ? "Practical meaning" : GRADE_TABLE_TEXT.meaning}
              </th>
            </tr>
          </thead>
          <tbody>
            {(["A", "B", "C", "D"] as const).map((g) => (
              <tr
                key={g}
                className={`border-t border-line ${grade === g ? "bg-brand-soft" : ""}`}
              >
                <th
                  scope="row"
                  className="w-24 p-3 align-top font-semibold text-ink"
                >
                  {g}
                  <span className="mt-1 block text-xs font-normal">
                    {(en ? gradeNamesEn : GRADE_MEANING)[g]}
                  </span>
                  {grade === g ? (
                    <span className="mt-2 block text-xs font-semibold text-brand">
                      {en ? "This batch" : REVISION_TEXT.currentGrade}
                    </span>
                  ) : null}
                </th>
                <td className="p-3 align-top leading-relaxed text-ink">
                  {meanings[g]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">
        {en ? gradeNoteEn : REVISION_TEXT.gradeMeaningNote}
      </p>
    </div>
  );
}

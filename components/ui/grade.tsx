import { cn } from "@/lib/cn";
import { formatScore } from "@/lib/format";
import { GRADE_MEANING } from "@/lib/text";
import type { GradeDb } from "@/lib/types/db";

const GRADE_BG: Record<GradeDb, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
};

const GRADE_TEXT: Record<GradeDb, string> = {
  A: "text-grade-a",
  B: "text-grade-b",
  C: "text-grade-c",
  D: "text-grade-d",
};

/**
 * Stempel grade — elemen paling menonjol di halaman verifikasi.
 * Bentuknya blok persegi seperti cap pemeriksaan, bukan lencana bulat.
 */
export function GradeStamp({
  grade,
  finalScore,
  className,
}: {
  grade: GradeDb;
  finalScore: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch border border-line", className)}>
      <div
        className={cn(
          "flex w-24 shrink-0 items-center justify-center text-grade-ink sm:w-28",
          GRADE_BG[grade],
        )}
      >
        <span className="font-mono text-6xl font-semibold leading-none sm:text-7xl">{grade}</span>
      </div>
      <div className="flex flex-col justify-center gap-1 bg-surface px-4 py-4 sm:px-5">
        <p className="text-lg font-semibold text-ink sm:text-xl">{GRADE_MEANING[grade]}</p>
        <p className="font-mono tabular text-sm text-ink-muted">
          Skor akhir {formatScore(finalScore)} dari 100
        </p>
      </div>
    </div>
  );
}

/** Versi ringkas untuk baris tabel & kartu daftar. */
export function GradeChip({ grade, className }: { grade: GradeDb; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-[2px] font-mono text-sm font-semibold text-grade-ink",
        GRADE_BG[grade],
        className,
      )}
      aria-label={`Grade ${grade} — ${GRADE_MEANING[grade]}`}
    >
      {grade}
    </span>
  );
}

export { GRADE_BG, GRADE_TEXT };

import { cn } from "@/lib/cn";
import { formatScore } from "@/lib/format";

/**
 * Bar horizontal sederhana untuk rincian skor (SRD Bab 9.2: jangan chart berat).
 * Angka tetap ditulis, bar hanya membantu membandingkan sekilas.
 */
export function ScoreBar({
  label,
  score,
  weightPct,
  contribution,
  hint,
  className,
}: {
  label: string;
  score: number;
  weightPct: number;
  contribution: number;
  hint?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={cn("py-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="font-mono tabular text-sm text-ink">
          {formatScore(score)}
          <span className="text-ink-muted">
            {" "}
            × {weightPct}% = {formatScore(contribution)}
          </span>
        </p>
      </div>
      <div
        className="mt-2 h-2 w-full bg-surface-sunken"
        role="img"
        aria-label={`${label}: ${formatScore(score)} dari 100, bobot ${weightPct} persen`}
      >
        <div className="h-full bg-brand" style={{ width: `${clamped}%` }} />
      </div>
      {hint ? <p className="mt-1.5 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}

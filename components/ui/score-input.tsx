"use client";

import { cn } from "@/lib/cn";

/**
 * Slider dan input angka berdampingan (SRD Bab 6.3) — slider untuk cepat,
 * angka untuk presisi. Keduanya terhubung ke satu label.
 */
export function ScoreInput({
  id,
  label,
  hint,
  weightPct,
  value,
  onChange,
  disabled,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  weightPct?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  function handle(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(0, Math.min(100, parsed)));
  }

  return (
    <div className={cn("py-3", disabled && "opacity-60", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {weightPct !== undefined ? (
            <span className="ml-2 font-mono tabular text-xs font-normal text-ink-muted">
              bobot {weightPct}%
            </span>
          ) : null}
        </label>
      </div>
      {hint ? <p className="mt-0.5 text-sm text-ink-muted">{hint}</p> : null}

      <div className="mt-2 flex items-center gap-3">
        <input
          id={`${id}-slider`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => handle(event.target.value)}
          aria-label={`${label} (slider)`}
          className="h-11 flex-1 accent-[var(--brand)]"
        />
        <input
          id={id}
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => handle(event.target.value)}
          className="h-11 w-20 rounded-[3px] border border-line-strong bg-surface px-2 text-right font-mono tabular text-ink"
        />
      </div>
    </div>
  );
}

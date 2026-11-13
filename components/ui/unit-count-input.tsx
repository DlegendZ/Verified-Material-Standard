"use client";
import { GRADER_TEXT } from "@/lib/text";
import { percentPassScore, unitPassPct } from "@/lib/scoring";
import { formatScore } from "@/lib/format";
import { Button } from "./button";
import { Input } from "./field";
import { useLocale } from "@/components/locale-provider";
import { assessmentEn } from "@/lib/assessment-english";
export function UnitCountInput({
  id,
  label,
  hint,
  checked,
  unitLabel,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string | null;
  checked: number;
  unitLabel: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const locale = useLocale();
  const text = locale === "en" ? assessmentEn : GRADER_TEXT;
  const passed = value === "" ? NaN : Number(value);
  const valid = Number.isInteger(passed) && passed >= 0 && passed <= checked;
  function change(delta: number) {
    onChange(
      String(Math.max(0, Math.min(checked, (valid ? passed : 0) + delta))),
    );
  }
  return (
    <div className="space-y-2 py-3">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || (valid && passed === 0)}
          aria-label={text.decrease(label)}
          onClick={() => change(-1)}
          className="min-h-11 min-w-11 px-3"
        >
          −
        </Button>
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          aria-describedby={`${id}-summary`}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) onChange(e.target.value);
          }}
          className="w-20 text-center font-mono"
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || (valid && passed >= checked)}
          aria-label={text.increase(label)}
          onClick={() => change(1)}
          className="min-h-11 min-w-11 px-3"
        >
          +
        </Button>
        <span className="text-sm text-ink-muted">
          {text.outOf} <strong>{checked}</strong> {unitLabel}
        </span>
      </div>
      <p
        id={`${id}-summary`}
        aria-live="polite"
        className="text-sm text-ink-muted"
      >
        {valid
          ? text.unitSummary(
              passed,
              checked,
              formatScore(unitPassPct(passed, checked), locale),
              formatScore(
                percentPassScore(unitPassPct(passed, checked)),
                locale,
              ),
            )
          : text.notFilled}
      </p>
    </div>
  );
}

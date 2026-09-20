"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateCategoryWeightsAction, type ActionState } from "../actions";
import { CRITERION_LABELS } from "@/lib/scoring";
import type { CategoryCriterionRow, CriterionDb } from "@/lib/types/db";

const initialState: ActionState = {};
const CRITERIA: CriterionDb[] = ["purity", "cleanliness", "quantity_accuracy"];

/**
 * Pengubahan bobot sub-kriteria. Total per kriteria ditampilkan langsung supaya
 * admin tahu sebelum menyimpan — dan server tetap menolak yang bukan 100.
 */
export function CategoryWeightsForm({
  categoryId,
  criteria,
}: {
  categoryId: string;
  criteria: CategoryCriterionRow[];
}) {
  const [state, formAction, pending] = useActionState(updateCategoryWeightsAction, initialState);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((row) => [row.id, String(row.weight_pct)])),
  );

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const row of criteria) {
      const value = Number(values[row.id]?.replace(",", ".") ?? 0);
      result[row.criterion] = (result[row.criterion] ?? 0) + (Number.isFinite(value) ? value : 0);
    }
    return result;
  }, [criteria, values]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="categoryId" value={categoryId} />

      {state.error ? (
        <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="border border-ok bg-ok-soft px-3 py-2 text-sm text-ok">
          {state.message ?? "Tersimpan."}
        </p>
      ) : null}

      {CRITERIA.map((criterion) => {
        const rows = criteria.filter((row) => row.criterion === criterion);
        if (rows.length === 0) return null;
        const total = totals[criterion] ?? 0;
        const valid = Math.abs(total - 100) < 1e-6;

        return (
          <fieldset key={criterion} className="space-y-2">
            <legend className="text-sm font-semibold text-ink">
              {CRITERION_LABELS[criterion]}
            </legend>

            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <label
                  htmlFor={`weight-${row.id}`}
                  className="min-w-0 flex-1 text-sm text-ink"
                >
                  {row.label}
                  {row.is_odor ? (
                    <span className="block text-xs text-ink-muted">
                      Sub-kriteria bau · cap override {row.odor_override_cap ?? 40}
                    </span>
                  ) : null}
                </label>
                <input
                  id={`weight-${row.id}`}
                  name={`weight:${row.id}:${row.criterion}`}
                  inputMode="decimal"
                  value={values[row.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [row.id]: event.target.value }))
                  }
                  className="h-10 w-20 rounded-[3px] border border-line-strong bg-surface px-2 text-right font-mono tabular text-ink"
                />
                <span className="w-4 text-sm text-ink-muted">%</span>
              </div>
            ))}

            <p
              className={`font-mono tabular text-sm ${valid ? "text-ink-muted" : "font-semibold text-danger"}`}
            >
              Total {total}% {valid ? "" : "— wajib tepat 100%"}
            </p>
          </fieldset>
        );
      })}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan bobot"}
      </Button>
    </form>
  );
}

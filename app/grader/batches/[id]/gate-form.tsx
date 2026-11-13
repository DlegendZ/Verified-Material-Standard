"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { saveGateCheckAction, type ActionState } from "../../actions";
import { GATES, GRADER_TEXT, REVISION_TEXT } from "@/lib/text";
import { useLocale } from "@/components/locale-provider";
import {
  assessmentEn,
  chemicalGateEn,
  gatesEn,
} from "@/lib/assessment-english";

const initialState: ActionState = {};

/**
 * Langkah 1 — gerbang wajib.
 *
 * Kalau ada satu gate yang tidak dicentang, batch berhenti di sini: form
 * skoring tidak pernah terbuka (SRD Bab 6.3).
 */
export function GateForm({
  batchId,
  nonB3Extra,
}: {
  batchId: string;
  nonB3Extra?: string | null;
}) {
  const action = saveGateCheckAction.bind(null, batchId);
  const en = useLocale() === "en";
  const text = en ? assessmentEn : GRADER_TEXT;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {en
            ? "Could not save the gate checks. Refresh the batch and try again."
            : state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
          {en ? chemicalGateEn : REVISION_TEXT.gateInspectHint}
        </p>
        {(en ? gatesEn : GATES).map((gate) => (
          <Checkbox
            key={gate.key}
            name={gate.key}
            label={gate.label}
            hint={
              !en && gate.key === "nonB3Pass"
                ? [gate.hint, nonB3Extra].filter(Boolean).join(" ")
                : gate.hint
            }
          />
        ))}
      </div>

      <Field
        label={text.gateNotes}
        htmlFor="notes"
        hint={text.gateNotesHint}
        error={
          state.fieldErrors?.notes &&
          (en ? text.gateNotesHint : state.fieldErrors.notes)
        }
      >
        <Textarea id="notes" name="notes" />
      </Field>

      <Button type="submit" size="block" disabled={pending}>
        {pending ? text.gateSaving : text.gateSave}
      </Button>

      <p className="text-sm text-ink-muted">{text.gateReminder}</p>
    </form>
  );
}

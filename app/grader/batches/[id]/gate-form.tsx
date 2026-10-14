"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { saveGateCheckAction, type ActionState } from "../../actions";
import { GATES, GRADER_TEXT, REVISION_TEXT } from "@/lib/text";

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
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
          {REVISION_TEXT.gateInspectHint}
        </p>
        {GATES.map((gate) => (
          <Checkbox
            key={gate.key}
            name={gate.key}
            label={gate.label}
            hint={
              gate.key === "nonB3Pass"
                ? [gate.hint, nonB3Extra].filter(Boolean).join(" ")
                : gate.hint
            }
          />
        ))}
      </div>

      <Field
        label={GRADER_TEXT.gateNotes}
        htmlFor="notes"
        hint={GRADER_TEXT.gateNotesHint}
        error={state.fieldErrors?.notes}
      >
        <Textarea id="notes" name="notes" />
      </Field>

      <Button type="submit" size="block" disabled={pending}>
        {pending ? GRADER_TEXT.gateSaving : GRADER_TEXT.gateSave}
      </Button>

      <p className="text-sm text-ink-muted">{GRADER_TEXT.gateReminder}</p>
    </form>
  );
}

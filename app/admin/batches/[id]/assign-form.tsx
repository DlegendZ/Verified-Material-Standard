"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { assignGraderAction, type ActionState } from "../../actions";

const initialState: ActionState = {};

/** Memilih grader untuk batch ini. Rotasi grader disarankan (limitation MVP). */
export function AssignGraderForm({
  batchId,
  graders,
}: {
  batchId: string;
  graders: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignGraderAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="batchId" value={batchId} />

      {state.error ? (
        <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Field
        label="Grader"
        htmlFor="graderId"
        hint="Hindari menugaskan grader yang sama berulang kali ke pabrik yang sama."
        required
      >
        <Select id="graderId" name="graderId" required defaultValue="">
          <option value="" disabled>
            Pilih grader
          </option>
          {graders.map((grader) => (
            <option key={grader.id} value={grader.id}>
              {grader.full_name}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Menugaskan…" : "Tugaskan grader"}
      </Button>
    </form>
  );
}

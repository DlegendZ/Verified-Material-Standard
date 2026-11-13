"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
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
  const [state, formAction, pending] = useActionState(
    assignGraderAction,
    initialState,
  );
  const en = useLocale() === "en";

  if (!graders.length)
    return (
      <p className="text-sm text-ink-muted">
        {en
          ? "No graders are available right now. "
          : "Belum ada grader yang tersedia. "}
        <Link className="text-brand underline" href="/admin/graders">
          {en ? "Manage availability" : "Atur ketersediaan"}
        </Link>
      </p>
    );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="batchId" value={batchId} />

      {state.error ? (
        <p
          role="alert"
          className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {en
            ? "Assignment failed. Refresh to check grader and batch availability."
            : state.error}
        </p>
      ) : null}

      <Field
        label="Grader"
        htmlFor="graderId"
        hint={
          en
            ? "Only available graders are listed."
            : "Hanya grader yang tersedia yang ditampilkan."
        }
        required
      >
        <Select id="graderId" name="graderId" required defaultValue="">
          <option value="" disabled>
            {en ? "Select a grader" : "Pilih grader"}
          </option>
          {graders.map((grader) => (
            <option key={grader.id} value={grader.id}>
              {grader.full_name}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" disabled={pending}>
        {pending
          ? en
            ? "Assigning…"
            : "Menugaskan…"
          : en
            ? "Assign grader"
            : "Tugaskan grader"}
      </Button>
    </form>
  );
}

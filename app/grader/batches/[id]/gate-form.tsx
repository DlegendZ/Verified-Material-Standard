"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { saveGateCheckAction, type ActionState } from "../../actions";
import { GATES } from "@/lib/text";

const initialState: ActionState = {};

/**
 * Langkah 1 — gerbang wajib.
 *
 * Kalau ada satu gate yang tidak dicentang, batch berhenti di sini: form
 * skoring tidak pernah terbuka (SRD Bab 6.3).
 */
export function GateForm({ batchId }: { batchId: string }) {
  const action = saveGateCheckAction.bind(null, batchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        {GATES.map((gate) => (
          <Checkbox key={gate.key} name={gate.key} label={gate.label} hint={gate.hint} />
        ))}
      </div>

      <Field
        label="Catatan"
        htmlFor="notes"
        hint="Wajib diisi minimal 10 karakter bila ada gate yang tidak lolos."
        error={state.fieldErrors?.notes}
      >
        <Textarea id="notes" name="notes" />
      </Field>

      <Button type="submit" size="block" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan hasil gerbang wajib"}
      </Button>

      <p className="text-sm text-ink-muted">
        Centang hanya gate yang benar-benar lolos. Gate yang gagal menghentikan proses — tidak ada
        skor, tidak ada grade, dan tidak ada sertifikat untuk batch ini.
      </p>
    </form>
  );
}

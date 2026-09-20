"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { revokeCertificateAction, type ActionState } from "../actions";

const initialState: ActionState = {};

/**
 * Pencabutan sertifikat. Alasannya wajib karena halaman publik akan
 * menampilkannya — pembeli berhak tahu kenapa sertifikat tidak berlaku.
 */
export function RevokeForm({ certificateId }: { certificateId: string }) {
  const [state, formAction, pending] = useActionState(revokeCertificateAction, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Cabut sertifikat
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-line pt-4">
      <input type="hidden" name="certificateId" value={certificateId} />

      {state.error ? (
        <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Field
        label="Alasan pencabutan"
        htmlFor={`reason-${certificateId}`}
        hint="Contoh: batch terkena hujan sebelum terjual sehingga kondisinya berubah signifikan."
        required
      >
        <Textarea id={`reason-${certificateId}`} name="reason" required minLength={10} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Mencabut…" : "Cabut sertifikat"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitBatchAction } from "../../actions";
import { useLocale } from "@/components/locale-provider";

/** Mengirim batch ke antrian Admin. Setelah dikirim, berkas tidak bisa diubah. */
export function SubmitBatchButton({
  batchId,
  disabled,
}: {
  batchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const en = useLocale() === "en";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitBatchAction(batchId);
      if (result.error)
        setError(
          en
            ? "Could not submit the batch. Check your factory and batch details."
            : result.error,
        );
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={submit} disabled={disabled || pending}>
        {pending
          ? en
            ? "Submitting…"
            : "Mengirim…"
          : en
            ? "Submit to VMS"
            : "Ajukan ke VMS"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

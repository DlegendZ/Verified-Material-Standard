"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitBatchAction } from "../../actions";

/** Mengirim batch ke antrian Admin. Setelah dikirim, berkas tidak bisa diubah. */
export function SubmitBatchButton({ batchId, disabled }: { batchId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitBatchAction(batchId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={submit} disabled={disabled || pending}>
        {pending ? "Mengirim…" : "Ajukan ke VMS"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteDraftBatchAction } from "../../actions";

export function DeleteDraftButton({
  batchId,
  batchCode,
  en,
}: {
  batchId: string;
  batchCode: string;
  en: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  function remove() {
    startTransition(async () => {
      const result = await deleteDraftBatchAction(batchId);
      setMessage(
        en
          ? "Could not delete this draft. Check its status and try again."
          : result.error,
      );
    });
  }

  return (
    <div className="space-y-2">
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      {confirm ? (
        <>
          <p role="status" className="text-sm text-ink">
            {en
              ? `Permanently delete draft ${batchCode} and its attachments?`
              : `Hapus permanen draft ${batchCode} beserta lampirannya?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={remove}
              disabled={pending}
            >
              {pending
                ? en
                  ? "Deleting…"
                  : "Menghapus…"
                : en
                  ? "Yes, delete draft"
                  : "Ya, hapus draft"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setConfirm(false);
                setMessage(undefined);
              }}
            >
              {en ? "Cancel" : "Batal"}
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="text-danger"
          onClick={() => setConfirm(true)}
        >
          {en ? "Delete draft" : "Hapus draft"}
        </Button>
      )}
    </div>
  );
}

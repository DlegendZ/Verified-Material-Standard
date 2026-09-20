"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { issueCertificateAction, markNotCertifiedAction } from "../../actions";
import type { GradeDb } from "@/lib/types/db";
import { ERRORS } from "@/lib/text";

/**
 * Penerbitan sertifikat hanya tersedia untuk grade A/B/C. Untuk grade D tombol
 * terbit sengaja tidak dirender — server juga menolaknya (kriteria A4).
 */
export function IssueButtons({ batchId, grade }: { batchId: string; grade: GradeDb }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function issue() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await issueCertificateAction(batchId);
      if (result.error) setError(result.error);
      else {
        setMessage(result.message ?? "Sertifikat terbit.");
        router.refresh();
      }
    });
  }

  function markNotCertified() {
    setError(null);
    startTransition(async () => {
      const result = await markNotCertifiedAction(batchId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {grade === "D" ? (
        <>
          <p className="border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            {ERRORS.gradeDNotCertifiable}
          </p>
          <Button variant="outline" onClick={markNotCertified} disabled={pending}>
            {pending ? "Menyimpan…" : "Tandai tidak lolos"}
          </Button>
        </>
      ) : (
        <Button onClick={issue} disabled={pending}>
          {pending ? "Menerbitkan…" : "Terbitkan sertifikat"}
        </Button>
      )}

      {message ? (
        <p role="status" className="border border-ok bg-ok-soft px-3 py-2 text-sm text-ok">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

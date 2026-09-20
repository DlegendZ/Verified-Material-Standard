"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setFactoryVerificationAction } from "../actions";

/** Tombol verifikasi/penolakan pabrik. Keduanya menulis jejak audit di server. */
export function VerificationButtons({ factoryId }: { factoryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(status: "verified" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await setFactoryVerificationAction(factoryId, status);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => run("verified")} disabled={pending}>
        Verifikasi
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("rejected")} disabled={pending}>
        Tolak
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

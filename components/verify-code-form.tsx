"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "./locale-provider";

/**
 * Pencarian sertifikat manual, untuk orang yang menerima nomor lewat chat dan
 * tidak bisa scan QR. Sengaja ada di halaman depan — ini janji utama produk.
 */
export function VerifyCodeForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const en = useLocale() === "en";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 0) return;
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <label htmlFor="certificate-code" className="sr-only">
          {en ? "Certificate number" : "Nomor sertifikat"}
        </label>
        <input
          id="certificate-code"
          name="code"
          value={code}
          autoFocus={autoFocus}
          onChange={(event) => setCode(event.target.value)}
          placeholder="VMS-2609-K7M2QX4A"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-line-strong bg-paper/70 px-4 font-mono text-base tracking-wide text-ink placeholder:text-ink-muted/60"
        />
      </div>
      <Button type="submit" size="lg" className="rounded-xl">
        {en ? "Check certificate" : "Cek sertifikat"}
      </Button>
    </form>
  );
}

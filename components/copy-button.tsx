"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Menyalin teks ke clipboard, dengan konfirmasi singkat di tombolnya. */
export function CopyButton({
  value,
  label,
  copiedLabel = "Tersalin",
  variant = "outline",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  variant?: "primary" | "outline" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Browser tanpa izin clipboard: teksnya tetap bisa diseleksi manual.
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={copy}>
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

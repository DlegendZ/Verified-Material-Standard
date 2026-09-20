"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BUCKETS, safeFileName, type BucketName } from "@/lib/storage";

/**
 * Unggah langsung dari browser ke Supabase Storage, lalu catat path-nya lewat
 * Server Action. File besar tidak perlu melewati server aplikasi.
 */
export function FileUploader({
  batchId,
  bucket,
  label,
  accept,
  onUploaded,
}: {
  batchId: string;
  bucket: BucketName;
  label: string;
  accept: string;
  onUploaded: (filePath: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const path = `${batchId}/${safeFileName(file.name)}`;
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setError(`Gagal mengunggah: ${uploadError.message}`);
        return;
      }

      const result = await onUploaded(path);
      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
        id={`upload-${bucket}-${batchId}`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" aria-hidden />
        {busy ? "Mengunggah…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { BUCKETS };

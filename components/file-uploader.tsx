"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  batchFileType,
  BUCKETS,
  DOCUMENT_ACCEPT,
  PHOTO_ACCEPT,
  safeFileName,
  type BucketName,
} from "@/lib/storage";
import { useLocale } from "./locale-provider";

/**
 * Unggah langsung dari browser ke Supabase Storage, lalu catat path-nya lewat
 * Server Action. File besar tidak perlu melewati server aplikasi.
 */
export function FileUploader({
  batchId,
  bucket,
  label,
  onUploaded,
}: {
  batchId: string;
  bucket: BucketName;
  label: string;
  onUploaded: (filePath: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const en = useLocale() === "en";
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const contentType = batchFileType(bucket, file.name, file.type);
      if (!contentType) {
        setError(
          bucket === BUCKETS.documents
            ? en
              ? "Choose a PDF or supported image."
              : "Pilih file PDF atau gambar yang didukung."
            : en
              ? "Choose a supported image."
              : "Pilih file gambar yang didukung.",
        );
        return;
      }
      const path = `${batchId}/${safeFileName(file.name)}`;
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });

      if (uploadError) {
        setError(
          `${en ? "Upload failed" : "Gagal mengunggah"}: ${uploadError.message}`,
        );
        return;
      }

      const result = await onUploaded(path);
      if (result.error) {
        setError(
          en
            ? "The attachment could not be saved. Check the batch status and file format."
            : result.error,
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        en
          ? "Upload failed. Check your connection and try again."
          : "Unggahan gagal. Periksa koneksi dan coba lagi.",
      );
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
        accept={bucket === BUCKETS.documents ? DOCUMENT_ACCEPT : PHOTO_ACCEPT}
        onChange={handleChange}
        className="sr-only"
        id={id}
        aria-label={label}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" aria-hidden />
        {busy ? (en ? "Uploading…" : "Mengunggah…") : label}
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

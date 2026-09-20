/**
 * Nama bucket dan URL objek Storage.
 *
 * batch-photos & certificates bersifat publik karena isinya memang tampil di
 * halaman verifikasi yang dibuka tanpa login. batch-documents privat — dokumen
 * asal-usul hanya boleh dilihat grader & admin lewat signed URL (keputusan A6).
 */
export const BUCKETS = {
  photos: "batch-photos",
  documents: "batch-documents",
  certificates: "certificates",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** URL publik objek pada bucket publik. */
export function publicObjectUrl(bucket: BucketName, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** Nama file aman: tanpa spasi/karakter aneh, tetap mempertahankan ekstensi. */
export function safeFileName(original: string): string {
  const dot = original.lastIndexOf(".");
  const ext = dot > -1 ? original.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${random}.${ext}`;
}

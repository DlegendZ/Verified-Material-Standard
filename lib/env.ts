/**
 * Pembacaan environment variable terpusat.
 *
 * Tidak ada nilai rahasia yang di-hardcode di repo (SRD Bab 12.2). Membaca env
 * lewat helper ini memberi pesan error yang jelas saat variabel lupa diisi,
 * daripada gagal misterius di tengah request.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} belum diisi. Salin .env.example ke .env.local lalu lengkapi nilainya.`,
    );
  }
  return value;
}

/**
 * Membersihkan URL project Supabase.
 *
 * Dashboard Supabase menampilkan beberapa URL sekaligus, dan yang paling sering
 * tersalin adalah "Data API URL" yang berakhiran /rest/v1. Client Supabase
 * menambahkan sendiri path itu, sehingga nilai mentahnya menghasilkan
 * /rest/v1/rest/v1/... dan ditolak dengan "Invalid path specified in request URL"
 * — padahal endpoint auth tetap jalan, jadi gejalanya membingungkan.
 *
 * Yang dibutuhkan hanya origin-nya: https://<ref>.supabase.co
 */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage|realtime)\/v\d+$/i, "")
    .replace(/\/+$/, "");
}

/** Aman dipakai di client — dibatasi Row Level Security. */
export function supabaseUrl(): string {
  return normalizeSupabaseUrl(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  );
}

export function supabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** HANYA server. Jangan pernah diimpor dari komponen client. */
export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** URL absolut aplikasi — dipakai sebagai isi QR code & metadata Open Graph. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Masa berlaku sertifikat dalam hari (keputusan D2, default 90). */
export function certificateValidityDays(): number {
  const raw = process.env.CERTIFICATE_VALIDITY_DAYS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 90;
}

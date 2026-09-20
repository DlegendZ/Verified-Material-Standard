import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Client service role — MELEWATI Row Level Security.
 *
 * Hanya untuk pekerjaan yang memang tidak bisa dilakukan atas nama pengguna:
 * menulis aset sertifikat (QR/PDF) ke Storage, membuat signed URL dokumen, dan
 * skrip seed. Setiap pemanggilnya WAJIB sudah memvalidasi peran lebih dulu
 * lewat `requireRole()`.
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

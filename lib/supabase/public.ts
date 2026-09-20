import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Client anon tanpa sesi, khusus halaman verifikasi publik.
 *
 * Sengaja tidak membaca cookie: halaman /verify/[code] harus bisa di-cache dan
 * tidak boleh berubah isinya tergantung siapa yang membuka. Satu-satunya akses
 * publik ke data adalah fungsi `public_certificate()` (SRD Bab 9.3).
 */
export function createSupabasePublicClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

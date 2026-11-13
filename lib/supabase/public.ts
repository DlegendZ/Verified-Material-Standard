import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { unstable_cache } from "next/cache";
import type { PublicCertificate } from "@/lib/types/db";

/**
 * Client anon tanpa sesi, khusus halaman verifikasi publik.
 *
 * Data publik tidak bergantung pada akun. Verifikasi dan katalog hanya membaca
 * payload yang disaring oleh fungsi RPC, tanpa memberikan anon akses tabel.
 */
export function createSupabasePublicClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const getPublicCertificate = unstable_cache(
  async (code: string) => {
    const { data, error } = await createSupabasePublicClient().rpc(
      "public_certificate",
      { p_code: code },
    );
    if (error) throw error;
    return data as PublicCertificate | null;
  },
  ["public-certificate"],
  { revalidate: 60 },
);

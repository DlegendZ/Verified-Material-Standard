"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Client Supabase untuk komponen client.
 *
 * Dipakai terbatas: unggah file ke Storage dan sign-out. Seluruh penulisan data
 * lain lewat Server Action supaya peran tervalidasi di server.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}

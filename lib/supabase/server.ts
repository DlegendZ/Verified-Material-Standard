import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { ProfileRow, UserRole } from "@/lib/types/db";

/**
 * Client Supabase untuk Server Component & Server Action.
 *
 * Memakai anon key + sesi pengguna, jadi seluruh query tetap lewat Row Level
 * Security. Untuk operasi yang memang butuh melewati RLS (render PDF sertifikat,
 * seed) pakai `lib/supabase/admin.ts` — dan tetap validasi peran sendiri.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component: penulisan cookie diurus middleware.
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
  profile: ProfileRow;
}

/** Pengguna yang sedang login beserta profilnya, atau null bila anonim. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) return null;
  return { id: user.id, email: user.email ?? null, profile };
}

/**
 * Error yang sengaja dilempar Server Action saat peran tidak cocok.
 * Jangan pernah percaya peran yang dikirim client (SRD Bab 4.3).
 */
export class AuthorizationError extends Error {
  constructor(message = "Kamu tidak punya akses untuk tindakan ini.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Memastikan pengguna login dan perannya termasuk yang diizinkan. */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Silakan masuk terlebih dahulu.");
  if (roles.length > 0 && !roles.includes(user.profile.role)) {
    throw new AuthorizationError();
  }
  return user;
}

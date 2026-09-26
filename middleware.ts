import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/env";

/**
 * Menyegarkan sesi Supabase di rute akun dan menjaga rute per peran.
 *
 * Penjagaan di sini hanya lapis pertama supaya pengguna tidak melihat halaman
 * kosong; keputusan akses yang sebenarnya tetap ada di Server Action + RLS.
 */
const ROLE_PREFIXES: { prefix: string; role: "factory" | "grader" | "admin" }[] = [
  { prefix: "/factory", role: "factory" },
  { prefix: "/grader", role: "grader" },
  { prefix: "/admin", role: "admin" },
];

const HOME_BY_ROLE: Record<string, string> = {
  factory: "/factory",
  grader: "/grader",
  admin: "/admin",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa env, biarkan halaman yang menampilkan pesan setup — jangan crash.
  if (!rawUrl || !anonKey) return response;

  // Normalisasi yang sama dengan lib/env.ts. Tanpa ini, URL berakhiran /rest/v1
  // membuat getUser() di middleware selalu gagal sehingga pengguna yang sudah
  // login tetap dilempar ke halaman masuk.
  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const guarded = ROLE_PREFIXES.find((entry) => path.startsWith(entry.prefix));

  if (guarded && !user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", path);
    return NextResponse.redirect(signIn);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role as string | undefined;

    if (guarded && role && role !== guarded.role) {
      const home = request.nextUrl.clone();
      home.pathname = HOME_BY_ROLE[role] ?? "/";
      return NextResponse.redirect(home);
    }

    if ((path === "/sign-in" || path === "/sign-up") && role) {
      const home = request.nextUrl.clone();
      home.pathname = HOME_BY_ROLE[role] ?? "/";
      return NextResponse.redirect(home);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/factory/:path*",
    "/grader/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};

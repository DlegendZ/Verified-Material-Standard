import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Menyegarkan sesi Supabase di setiap request dan menjaga rute per peran.
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa env, biarkan halaman yang menampilkan pesan setup — jangan crash.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
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
    /*
     * Semua rute kecuali aset statis. Halaman verifikasi publik ikut lewat sini
     * tapi tidak pernah diblokir — memang harus bisa dibuka tanpa sesi.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

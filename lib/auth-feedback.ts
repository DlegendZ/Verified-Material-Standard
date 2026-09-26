export const AUTH_UNAVAILABLE =
  "Layanan akun tidak dapat dihubungi. Coba lagi beberapa saat.";

export function authErrorMessage(
  error: { status?: number; code?: string },
  flow: "sign-in" | "sign-up",
): string {
  if (error.status === 0) return AUTH_UNAVAILABLE;
  if (flow === "sign-in") {
    if (error.status === 429) {
      return "Terlalu banyak percobaan. Tunggu sebentar, lalu masuk lagi.";
    }
    if (error.code === "email_not_confirmed") {
      return "Konfirmasi email pendaftaranmu dulu, lalu coba masuk lagi.";
    }
    return "Email atau kata sandi salah.";
  }
  if (error.status === 429) {
    return "Terlalu banyak percobaan. Tunggu sebentar, lalu daftar lagi.";
  }
  return "Pendaftaran gagal. Periksa data dan coba lagi.";
}

"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/locale";

export async function setLocaleAction(formData: FormData) {
  (await cookies()).set(
    LOCALE_COOKIE,
    normalizeLocale(formData.get("locale")),
    {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: true,
    },
  );
}

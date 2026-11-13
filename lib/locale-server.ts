import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, normalizeLocale } from "./locale";

export const getLocale = cache(async () =>
  normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value),
);

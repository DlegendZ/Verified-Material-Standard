export type Locale = "id" | "en";
export const LOCALE_COOKIE = "vms-locale";

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "id";
}

export function localeTag(locale: Locale): string {
  return locale === "en" ? "en-GB" : "id-ID";
}

/**
 * Helper tampilan. Pembulatan hanya terjadi di sini dan di penentuan grade —
 * perhitungan internal scoring engine tetap presisi penuh (SRD Bab 7.7).
 */

import { localeTag, type Locale } from "./locale";

const numberOptions: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
};
const numbers = {
  id: new Intl.NumberFormat("id-ID", numberOptions),
  en: new Intl.NumberFormat("en-GB", numberOptions),
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Skor kriteria: 1 desimal, gaya Indonesia (koma). */
export function formatScore(
  value: number | string | null | undefined,
  locale: Locale = "id",
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return numbers[locale].format(num);
}

export function formatWeight(
  value: number | string | null | undefined,
  locale: Locale = "id",
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${numbers[locale].format(num)} kg`;
}

export function formatPercent(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${numbers.id.format(num)}%`;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale = "id",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return locale === "id"
    ? dateFormatter.format(date)
    : new Intl.DateTimeFormat(localeTag(locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/** Sisa hari menuju `validUntil`; negatif berarti sudah lewat. */
export function daysUntil(
  value: string | Date,
  now: Date = new Date(),
): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function formatValidity(days: number, locale: Locale = "id"): string {
  if (locale === "en") {
    const weeks = days / 7;
    return Number.isInteger(weeks)
      ? `${weeks} ${weeks === 1 ? "week" : "weeks"}`
      : `${days} ${days === 1 ? "day" : "days"}`;
  }
  return days % 7 === 0 ? `${days / 7} minggu` : `${days} hari`;
}

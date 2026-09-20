/**
 * Helper tampilan. Pembulatan hanya terjadi di sini dan di penentuan grade —
 * perhitungan internal scoring engine tetap presisi penuh (SRD Bab 7.7).
 */

const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

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
export function formatScore(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return numberFormatter.format(num);
}

export function formatWeight(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${numberFormatter.format(num)} kg`;
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${numberFormatter.format(num)}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/** Sisa hari menuju `validUntil`; negatif berarti sudah lewat. */
export function daysUntil(value: string | Date, now: Date = new Date()): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

/** Aman di browser: dipakai pratinjau pabrik dan server, tanpa crypto/I/O. */
import type { ClaimedSpecDetail } from "./validation/schemas";
import { CLAIM_TEXT } from "./text";
import { localeTag, type Locale } from "./locale";
export function claimedSpecSummary(
  detail: ClaimedSpecDetail,
  profile: { name: string },
  declaredMaterialType: string,
  claimedWeightKg: number,
  locale: Locale = "id",
): string {
  const number = new Intl.NumberFormat(localeTag(locale), {
    maximumFractionDigits: 10,
  });
  const words =
    locale === "en"
      ? {
          bundle: "bundles",
          units: "sticks",
          crossSection: "cross-section",
          length: "length",
          tolerance: "tolerance",
          total: "total",
          cm: "cm",
          kg: "kg",
        }
      : CLAIM_TEXT;
  const n = (v: number) => number.format(v);
  const parts = [declaredMaterialType, profile.name];
  if (detail.claimMode === "bundle") {
    parts.push(
      `${n(detail.bundleCount)} ${words.bundle} × ${n(detail.unitsPerBundle)} ${words.units}`,
      `${words.crossSection} ${n(detail.crossSectionWidthCm)} × ${n(detail.crossSectionThicknessCm)} ${words.cm}`,
      `${words.length} ${n(detail.lengthCm)} ${words.cm}`,
      `${words.tolerance} ${words.crossSection} ±${n(detail.crossSectionToleranceCm)} ${words.cm}, ${words.length} ±${n(detail.lengthToleranceCm)} ${words.cm}`,
    );
  } else {
    parts.push(
      `${words.length} ${n(detail.lengthMinCm)}–${n(detail.lengthMaxCm)} ${words.cm} (${words.tolerance} ±${n(detail.lengthToleranceCm)} ${words.cm})`,
    );
    if (detail.crossSectionNote?.trim())
      parts.push(detail.crossSectionNote.trim());
  }
  parts.push(`${words.total} ${n(claimedWeightKg)} ${words.kg}`);
  return parts.join(" · ");
}

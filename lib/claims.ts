/** Aman di browser: dipakai pratinjau pabrik dan server, tanpa crypto/I/O. */
import type { ClaimedSpecDetail } from "./validation/schemas";
import { CLAIM_TEXT } from "./text";
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 10 });
export function claimedSpecSummary(
  detail: ClaimedSpecDetail,
  profile: { name: string },
  declaredMaterialType: string,
  claimedWeightKg: number,
): string {
  const n = (v: number) => number.format(v);
  const parts = [declaredMaterialType, profile.name];
  if (detail.claimMode === "bundle") {
    parts.push(
      `${n(detail.bundleCount)} ${CLAIM_TEXT.bundle} × ${n(detail.unitsPerBundle)} ${CLAIM_TEXT.units}`,
      `${CLAIM_TEXT.crossSection} ${n(detail.crossSectionWidthCm)} × ${n(detail.crossSectionThicknessCm)} ${CLAIM_TEXT.cm}`,
      `${CLAIM_TEXT.length} ${n(detail.lengthCm)} ${CLAIM_TEXT.cm}`,
      `${CLAIM_TEXT.tolerance} ${CLAIM_TEXT.crossSection} ±${n(detail.crossSectionToleranceCm)} ${CLAIM_TEXT.cm}, ${CLAIM_TEXT.length} ±${n(detail.lengthToleranceCm)} ${CLAIM_TEXT.cm}`,
    );
  } else {
    parts.push(
      `${CLAIM_TEXT.length} ${n(detail.lengthMinCm)}–${n(detail.lengthMaxCm)} ${CLAIM_TEXT.cm} (${CLAIM_TEXT.tolerance} ±${n(detail.lengthToleranceCm)} ${CLAIM_TEXT.cm})`,
    );
    if (detail.crossSectionNote?.trim())
      parts.push(detail.crossSectionNote.trim());
  }
  parts.push(`${CLAIM_TEXT.total} ${n(claimedWeightKg)} ${CLAIM_TEXT.kg}`);
  return parts.join(" · ");
}

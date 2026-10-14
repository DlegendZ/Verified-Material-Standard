import { describe, expect, it } from "vitest";
import { canonicalCountChecks } from "./grading-input";
const detail = {
  claimMode: "bundle" as const,
  bundleCount: 20,
  unitsPerBundle: 20,
  crossSectionWidthCm: 3,
  crossSectionThicknessCm: 4,
  lengthCm: 100,
  crossSectionToleranceCm: 0.2,
  lengthToleranceCm: 1,
};
const checks = ["top", "middle", "bottom"].map((p) => ({
  key: `units_per_bundle_${p}`,
  observed: 19,
  claimed: 19,
  label: "klaim palsu client",
}));
describe("klaim hitungan ditentukan server", () => {
  it("mengabaikan claimed dan label dari client", () => {
    const r = canonicalCountChecks(detail, [
      ...checks,
      { key: "bundle_count", observed: 18 },
    ]);
    expect(r.map((c) => c.claimed)).toEqual([20, 20, 20, 20]);
    expect(r[0].label).not.toContain("palsu");
  });
  it("tiga titik wajib lengkap dan tidak duplikat", () => {
    expect(() => canonicalCountChecks(detail, checks.slice(0, 2))).toThrow();
    expect(() =>
      canonicalCountChecks(detail, [...checks, checks[0]]),
    ).toThrow();
  });
  it("profil berat tidak memakai hitungan ikat", () =>
    expect(
      canonicalCountChecks(
        {
          claimMode: "weight",
          lengthMinCm: 15,
          lengthMaxCm: 40,
          lengthToleranceCm: 1,
        },
        checks,
      ),
    ).toEqual([]));
});

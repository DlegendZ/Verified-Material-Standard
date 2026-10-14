import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_CATEGORY_CODES, SEED_CATEGORIES } from "./categories";
import { validateCategoryConfig } from "./scoring";
const sql = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");
function rowsBetween(start: string, end?: string): string[][] {
  const from = sql.indexOf(start);
  expect(from).toBeGreaterThanOrEqual(0);
  const until = end ? sql.indexOf(end, from) : sql.length;
  return [...sql.slice(from, until).matchAll(/^\s*\((.*)\)[,;]?\s*$/gm)].map(
    (m) =>
      [...m[1].matchAll(/'(?:[^']|'')*'|null(?:::\w+)?|true|false|-?\d+/g)].map(
        (t) =>
          t[0].startsWith("'")
            ? t[0].slice(1, -1).replaceAll("''", "'")
            : t[0].split("::")[0],
      ),
  );
}
describe("sinkronisasi kategori, metadata dan profil ↔ SQL (A3)", () => {
  const categoryRows = rowsBetween(
    "insert into public.material_categories",
    "insert into public.category_criteria",
  );
  const criteriaRows = rowsBetween(
    "insert into public.category_criteria",
    "insert into public.material_form_profiles",
  );
  const profileRows = rowsBetween(
    "insert into public.material_form_profiles",
    "-- Kategori lama",
  );
  it("jumlah baris identik dan 4 kategori aktif", () => {
    expect(categoryRows).toHaveLength(4);
    expect(criteriaRows).toHaveLength(
      SEED_CATEGORIES.reduce((sum, c) => sum + c.criteria.length, 0),
    );
    expect(profileRows).toHaveLength(2);
    expect(categoryRows.map((r) => r[1])).toEqual(
      SEED_CATEGORIES.map((c) => c.code),
    );
  });
  it.each(SEED_CATEGORIES.map((c) => [c.code, c] as const))(
    "kategori %s identik",
    (code, c) => {
      const row = categoryRows.find((r) => r[1] === code)!;
      expect(row.slice(1, 9)).toEqual([
        code,
        c.name,
        String(c.isActive),
        c.status,
        c.notes,
        String(c.sortOrder),
        c.shortDescription,
        String(c.certificateValidityDays),
      ]);
      expect(row[9] === "null" ? null : JSON.parse(row[9])).toEqual(
        c.gradeMeanings,
      );
      expect(row.slice(10)).toEqual(
        [
          c.odorLevel3Hint,
          c.nonB3Extra,
          c.claimBoundary,
          c.thresholdDisclaimer,
        ].map((v) => v ?? "null"),
      );
      for (const sub of c.criteria) {
        const r = criteriaRows.find(
          (r) => r[0] === code && r[1] === sub.criterion && r[2] === sub.subKey,
        )!;
        expect(r.slice(0, 10)).toEqual([
          code,
          sub.criterion,
          sub.subKey,
          sub.label,
          String(sub.weightPct),
          String(sub.isOdor),
          String(sub.odorOverrideCap),
          String(c.criteria.indexOf(sub) + 1),
          sub.scoringMethod,
          String(sub.requiresMeasurementMethod),
        ]);
      }
      for (const p of c.profiles) {
        const r = profileRows.find((r) => r[1] === code && r[2] === p.code)!;
        expect(r.slice(2)).toEqual([
          p.code,
          p.name,
          p.description,
          p.pointDefinition,
          p.unitLabel,
          String(p.unitsPerPoint),
          p.samplingNotes,
          p.claimMode,
          String(p.sortOrder),
          "true",
        ]);
      }
    },
  );
  it("kategori live valid; kaca/keramik sengaja tanpa sub-kriteria", () => {
    for (const c of SEED_CATEGORIES.filter((c) => c.status === "live"))
      expect(() => validateCategoryConfig(c)).not.toThrow();
    for (const code of ["glass", "ceramic"])
      expect(
        SEED_CATEGORIES.find((c) => c.code === code)!.criteria,
      ).toHaveLength(0);
  });
  it("kategori lama tidak dibuat; batu/pasir tidak ada", () => {
    const codes = categoryRows.map((r) => r[1]);
    for (const code of [
      ...LEGACY_CATEGORY_CODES,
      "stone",
      "sand",
      "batu",
      "pasir",
    ])
      expect(codes).not.toContain(code);
    expect(SEED_CATEGORIES.map((c) => c.code)).toEqual([
      "solid_wood",
      "metal",
      "glass",
      "ceramic",
    ]);
  });
});

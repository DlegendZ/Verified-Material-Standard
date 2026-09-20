import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_CATEGORIES } from "./categories";
import { validateCategoryConfig } from "./scoring";

/**
 * Menjaga keputusan A3 di DECISIONS.md: konfigurasi kategori ditulis di dua
 * tempat (lib/categories.ts untuk fixture test, supabase/seed.sql untuk isi
 * tabel). Test ini yang memastikan keduanya tidak pernah bergeser diam-diam.
 */
const SEED_SQL = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");

const ROW_PATTERN =
  /^\s*\('(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'(.+)',\s*(\d+),\s*(true|false),\s*(null|\d+)(?:::int)?,\s*\d+\),?\s*$/;

interface SeedRow {
  categoryCode: string;
  criterion: string;
  subKey: string;
  label: string;
  weightPct: number;
  isOdor: boolean;
  odorOverrideCap: number | null;
}

function parseSeedRows(): SeedRow[] {
  return SEED_SQL.split("\n")
    .map((line) => ROW_PATTERN.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((m) => ({
      categoryCode: m[1],
      criterion: m[2],
      subKey: m[3],
      label: m[4],
      weightPct: Number(m[5]),
      isOdor: m[6] === "true",
      odorOverrideCap: m[7] === "null" ? null : Number(m[7]),
    }));
}

describe("sinkronisasi lib/categories.ts ↔ supabase/seed.sql", () => {
  const rows = parseSeedRows();

  it("seed.sql terbaca dan jumlah barisnya sama", () => {
    const expected = SEED_CATEGORIES.reduce((acc, c) => acc + c.criteria.length, 0);
    expect(rows.length).toBe(expected);
  });

  it.each(SEED_CATEGORIES.map((c) => [c.code, c] as const))(
    "kategori %s identik di kedua sumber",
    (code, category) => {
      const seedRows = rows.filter((r) => r.categoryCode === code);
      expect(seedRows.length).toBe(category.criteria.length);

      for (const sub of category.criteria) {
        const row = seedRows.find(
          (r) => r.criterion === sub.criterion && r.subKey === sub.subKey,
        );
        expect(row, `${code}.${sub.criterion}.${sub.subKey} tidak ada di seed.sql`).toBeDefined();
        expect(row!.label).toBe(sub.label);
        expect(row!.weightPct).toBe(sub.weightPct);
        expect(row!.isOdor).toBe(sub.isOdor);
        expect(row!.odorOverrideCap).toBe(sub.odorOverrideCap);
      }
    },
  );

  it("setiap kategori seed lolos validasi scoring engine", () => {
    for (const category of SEED_CATEGORIES) {
      expect(() => validateCategoryConfig(category), category.code).not.toThrow();
    }
  });

  it("seluruh kategori di seed.sql juga ada di lib/categories.ts", () => {
    const seedCodes = new Set(rows.map((r) => r.categoryCode));
    const libCodes = new Set(SEED_CATEGORIES.map((c) => c.code));
    expect([...seedCodes].sort()).toEqual([...libCodes].sort());
  });
});

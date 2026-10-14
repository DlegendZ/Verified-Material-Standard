import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_CODE_PATTERN,
  effectiveStatus,
  generateBatchCode,
  generateCertificateCode,
  isValidCertificateCode,
  listingSnippet,
  validUntilFrom,
  claimedSpecSummary,
} from "./certificate";

describe("kode sertifikat", () => {
  it("mengikuti format VMS-<YYMM>-<8 karakter base32>", () => {
    const code = generateCertificateCode(new Date("2026-09-20T00:00:00Z"));
    expect(code).toMatch(CERTIFICATE_CODE_PATTERN);
    expect(code.startsWith("VMS-2609-")).toBe(true);
  });

  it("tidak berurutan — dua kode berturut-turut berbeda", () => {
    const codes = new Set(
      Array.from({ length: 50 }, () => generateCertificateCode()),
    );
    expect(codes.size).toBe(50);
  });

  it("tidak memakai huruf/angka yang mudah tertukar saat dibaca manual", () => {
    const suffix = generateCertificateCode().split("-")[2];
    expect(suffix).not.toMatch(/[01]/);
  });

  it("memvalidasi kode termasuk yang ditulis huruf kecil", () => {
    const code = generateCertificateCode();
    expect(isValidCertificateCode(code.toLowerCase())).toBe(true);
    expect(isValidCertificateCode("VMS-2609-SHORT")).toBe(false);
    expect(isValidCertificateCode("bukan kode")).toBe(false);
  });

  it("kode batch memakai awalan berbeda supaya tidak tertukar", () => {
    expect(generateBatchCode(new Date("2026-09-20T00:00:00Z"))).toMatch(
      /^BATCH-2609-[A-Z2-7]{6}$/,
    );
  });
});

describe("masa berlaku", () => {
  it("valid_until dihitung dari tanggal terbit + jumlah hari", () => {
    const issued = new Date("2026-09-20T10:00:00Z");
    expect(validUntilFrom(issued, 42).toISOString().slice(0, 10)).toBe(
      "2026-11-01",
    );
  });

  it("sertifikat aktif sebelum tanggal kedaluwarsa", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(effectiveStatus("issued", "2026-11-01T00:00:00Z", now)).toBe(
      "valid",
    );
  });

  it("lewat tanggal berlaku menjadi kedaluwarsa", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(effectiveStatus("issued", "2026-11-01T00:00:00Z", now)).toBe(
      "expired",
    );
  });

  it("dicabut menang atas kedaluwarsa — alasannya lebih penting diketahui", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(effectiveStatus("revoked", "2026-11-01T00:00:00Z", now)).toBe(
      "revoked",
    );
    expect(effectiveStatus("superseded", "2030-01-01T00:00:00Z", now)).toBe(
      "revoked",
    );
  });
});

describe("teks siap-tempel untuk listing", () => {
  it("memuat grade, skor, nomor sertifikat, dan link verifikasi", () => {
    const snippet = listingSnippet({
      grade: "B",
      finalScore: 78,
      certificateCode: "VMS-2609-K7M2QX4A",
      categoryName: "Kayu Solid",
      validUntil: "2026-11-01T00:00:00Z",
    });

    expect(snippet).toContain("Grade B");
    expect(snippet).toContain("78/100");
    expect(snippet).toContain("VMS-2609-K7M2QX4A");
    expect(snippet).toContain("/verify/VMS-2609-K7M2QX4A");
    expect(snippet).toContain("Kayu Solid");
  });

  it("menyebut batas tanggung jawab VMS", () => {
    const snippet = listingSnippet({
      grade: "A",
      finalScore: 92,
      certificateCode: "VMS-2609-AAAAAAAA",
      categoryName: "Besi & Logam",
      validUntil: new Date("2026-11-01T00:00:00Z"),
    });

    expect(snippet).toContain("tidak menjual material");
  });
});

describe("klaim terstruktur & teks listing v1.3", () => {
  it("batang berikat persis Bab 7.4.3", () => {
    expect(
      claimedSpecSummary(
        {
          claimMode: "bundle",
          bundleCount: 20,
          unitsPerBundle: 20,
          crossSectionWidthCm: 3,
          crossSectionThicknessCm: 4,
          lengthCm: 100,
          crossSectionToleranceCm: 0.2,
          lengthToleranceCm: 1,
        },
        { name: "Batang berikat" },
        "Pinus",
        400,
      ),
    ).toBe(
      "Pinus · Batang berikat · 20 ikat × 20 batang · penampang 3 × 4 cm · panjang 100 cm · toleransi penampang ±0,2 cm, panjang ±1 cm · total 400 kg",
    );
  });
  it("potongan lepas dengan dan tanpa catatan penampang", () => {
    const detail = {
      claimMode: "weight" as const,
      lengthMinCm: 15,
      lengthMaxCm: 40,
      lengthToleranceCm: 1,
      crossSectionNote: "tebal 2–4 cm",
    };
    expect(
      claimedSpecSummary(
        detail,
        { name: "Potongan pendek lepas" },
        "Jati",
        150,
      ),
    ).toBe(
      "Jati · Potongan pendek lepas · panjang 15–40 cm (toleransi ±1 cm) · tebal 2–4 cm · total 150 kg",
    );
    expect(
      claimedSpecSummary(
        { ...detail, crossSectionNote: "" },
        { name: "Potongan pendek lepas" },
        "Jati",
        150,
      ),
    ).not.toContain(" ·  · ");
  });
  it("listing cek tanpa akun, bentuk opsional, tanpa rekomendasi harga", () => {
    const input = {
      grade: "B" as const,
      finalScore: 77,
      certificateCode: "VMS-2610-ABCDEFGH",
      categoryName: "Kayu Solid",
      validUntil: "2026-11-01T00:00:00Z",
    };
    const text = listingSnippet({
      ...input,
      formProfileName: "Batang berikat",
      validityNote: "6 minggu",
    });
    expect(text).toContain("Material: Kayu Solid — Batang berikat");
    expect(text).toContain("Cek keaslian (tanpa akun/login):");
    expect(text).toContain("tidak menentukan harga");
    expect(text).toContain("6 minggu");
    expect(text).not.toMatch(/Rp|rekomendasi harga/);
    expect(listingSnippet(input)).toContain("Material: Kayu Solid\n");
  });
});

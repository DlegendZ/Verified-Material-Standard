import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_CODE_PATTERN,
  effectiveStatus,
  generateBatchCode,
  generateCertificateCode,
  isValidCertificateCode,
  listingSnippet,
  validUntilFrom,
} from "./certificate";

describe("kode sertifikat", () => {
  it("mengikuti format VMS-<YYMM>-<8 karakter base32>", () => {
    const code = generateCertificateCode(new Date("2026-09-20T00:00:00Z"));
    expect(code).toMatch(CERTIFICATE_CODE_PATTERN);
    expect(code.startsWith("VMS-2609-")).toBe(true);
  });

  it("tidak berurutan — dua kode berturut-turut berbeda", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCertificateCode()));
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
    expect(validUntilFrom(issued, 90).toISOString().slice(0, 10)).toBe("2026-12-19");
  });

  it("sertifikat aktif sebelum tanggal kedaluwarsa", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(effectiveStatus("issued", "2026-12-19T00:00:00Z", now)).toBe("valid");
  });

  it("lewat tanggal berlaku menjadi kedaluwarsa", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(effectiveStatus("issued", "2026-12-19T00:00:00Z", now)).toBe("expired");
  });

  it("dicabut menang atas kedaluwarsa — alasannya lebih penting diketahui", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(effectiveStatus("revoked", "2026-12-19T00:00:00Z", now)).toBe("revoked");
    expect(effectiveStatus("superseded", "2030-01-01T00:00:00Z", now)).toBe("revoked");
  });
});

describe("teks siap-tempel untuk listing", () => {
  it("memuat grade, skor, nomor sertifikat, dan link verifikasi", () => {
    const snippet = listingSnippet({
      grade: "B",
      finalScore: 78,
      certificateCode: "VMS-2609-K7M2QX4A",
      categoryName: "Tekstil",
      validUntil: "2026-12-19T00:00:00Z",
    });

    expect(snippet).toContain("Grade B");
    expect(snippet).toContain("78/100");
    expect(snippet).toContain("VMS-2609-K7M2QX4A");
    expect(snippet).toContain("/verify/VMS-2609-K7M2QX4A");
    expect(snippet).toContain("Tekstil");
  });

  it("menyebut batas tanggung jawab VMS", () => {
    const snippet = listingSnippet({
      grade: "A",
      finalScore: 92,
      certificateCode: "VMS-2609-AAAAAAAA",
      categoryName: "Logam & Besi",
      validUntil: new Date("2026-12-19T00:00:00Z"),
    });

    expect(snippet).toContain("tidak menjual material");
  });
});

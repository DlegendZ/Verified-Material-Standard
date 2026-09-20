import { randomInt } from "node:crypto";
import { siteUrl } from "./env";
import type { CertificateStatus, GradeDb } from "./types/db";
import { GRADE_MEANING } from "./text";

/**
 * Pembuatan kode sertifikat & teks turunannya.
 *
 * Kode wajib unik dan TIDAK BISA DITEBAK (SRD Bab 5.3) — kalau berurutan, orang
 * bisa menjelajah sertifikat pabrik lain. Format: VMS-<YY><MM>-<8 karakter
 * base32 Crockford tanpa huruf mirip angka>, contoh VMS-2609-K7M2QX4A.
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateCertificateCode(now: Date = new Date()): string {
  const yy = String(now.getFullYear() % 100).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += BASE32_ALPHABET[randomInt(BASE32_ALPHABET.length)];
  }
  return `VMS-${yy}${mm}-${suffix}`;
}

/** Kode batch internal; boleh berurutan karena tidak dipakai di URL publik. */
export function generateBatchCode(now: Date = new Date()): string {
  const yy = String(now.getFullYear() % 100).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += BASE32_ALPHABET[randomInt(BASE32_ALPHABET.length)];
  }
  return `BATCH-${yy}${mm}-${suffix}`;
}

export const CERTIFICATE_CODE_PATTERN = /^VMS-\d{4}-[A-Z2-7]{8}$/;

export function isValidCertificateCode(code: string): boolean {
  return CERTIFICATE_CODE_PATTERN.test(code.trim().toUpperCase());
}

/** URL absolut halaman verifikasi — ini juga yang jadi isi QR code. */
export function verificationUrl(code: string): string {
  return `${siteUrl()}/verify/${code}`;
}

/**
 * Status efektif yang tampil di halaman publik.
 * Dicabut menang atas kedaluwarsa: alasan pencabutan lebih penting diketahui.
 */
export type EffectiveStatus = "valid" | "revoked" | "expired";

export function effectiveStatus(
  status: CertificateStatus,
  validUntil: string | Date,
  now: Date = new Date(),
): EffectiveStatus {
  if (status === "revoked" || status === "superseded") return "revoked";
  const until = typeof validUntil === "string" ? new Date(validUntil) : validUntil;
  return until.getTime() < now.getTime() ? "expired" : "valid";
}

/** Tanggal kedaluwarsa dari tanggal terbit + masa berlaku. */
export function validUntilFrom(issuedAt: Date, validityDays: number): Date {
  const result = new Date(issuedAt);
  result.setDate(result.getDate() + validityDays);
  return result;
}

/**
 * Teks siap-tempel untuk deskripsi listing marketplace.
 * Fitur kecil tapi penting untuk demo (SRD Bab 6.1) — penjual tinggal paste.
 */
export function listingSnippet(params: {
  grade: GradeDb;
  finalScore: number;
  certificateCode: string;
  categoryName: string;
  validUntil: string | Date;
}): string {
  const until =
    typeof params.validUntil === "string" ? new Date(params.validUntil) : params.validUntil;
  const untilText = until.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return [
    `[TERVERIFIKASI VMS] Grade ${params.grade} — ${GRADE_MEANING[params.grade]} (skor ${params.finalScore}/100)`,
    `Kategori material: ${params.categoryName}`,
    `Nomor sertifikat: ${params.certificateCode}`,
    `Cek keaslian sertifikat di: ${verificationUrl(params.certificateCode)}`,
    `Berlaku sampai ${untilText}.`,
    "",
    "VMS (Verified Material Standard) adalah lembaga grading independen. VMS menilai kondisi batch lewat sampling 3 titik, tidak menjual material dan tidak memegang transaksi.",
  ].join("\n");
}

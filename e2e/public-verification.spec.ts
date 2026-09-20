import { expect, test } from "@playwright/test";

/**
 * Kriteria penerimaan A6: halaman verifikasi publik harus bisa dibuka tanpa
 * sesi login sama sekali. Konteks browser di sini memang bersih.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("landing page menjelaskan produk dan menyediakan pencarian sertifikat", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder("VMS-")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cek sertifikat" })).toBeVisible();
});

test("kode sertifikat yang tidak ada menampilkan halaman khusus, bukan error", async ({ page }) => {
  await page.goto("/verify/VMS-9999-ZZZZZZZZ");

  await expect(page.getByText("Sertifikat tidak ditemukan")).toBeVisible();
  await expect(page.getByPlaceholder("VMS-")).toBeVisible();
});

test("halaman verifikasi tidak menampilkan data kontak pabrik", async ({ page, request }) => {
  // Ambil satu kode sertifikat dari halaman admin? Tidak — publik tidak punya
  // akses. Demo memakai kode dari seed, dibaca lewat variabel lingkungan.
  const code = process.env.E2E_CERTIFICATE_CODE;
  test.skip(!code, "Set E2E_CERTIFICATE_CODE dari hasil npm run seed:demo");

  const response = await request.get(`/verify/${code}`);
  expect(response.status()).toBe(200);

  const html = await response.text();
  expect(html).not.toContain("@vms.demo");
  expect(html).not.toContain("contact_phone");

  await page.goto(`/verify/${code}`);
  await expect(page.getByText(/SERTIFIKAT (BERLAKU|TIDAK BERLAKU)|KEDALUWARSA/)).toBeVisible();
});

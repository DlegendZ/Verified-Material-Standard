import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });
test("beranda menampilkan pilot Kayu Solid dan tepat 3 kategori Segera hadir", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Kayu Solid", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Segera hadir", { exact: true })).toHaveCount(3);
  await expect(page.locator("#material article h3")).toHaveText([
    "Kayu Solid",
    "Besi & Logam",
    "Kaca",
    "Keramik",
  ]);
  await expect(page.locator("body")).not.toContainText(/\b(Batu|Pasir)\b/i);
  expect(new URL(page.url()).pathname).toBe("/");
});
test("FAQ menjelaskan penilai dan keputusan rekomendasi harga", async ({
  page,
}) => {
  await page.goto("/tentang");
  await expect(
    page.getByText("Siapa yang memverifikasi kualitas material?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Kenapa VMS tidak memberi rekomendasi harga?", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByText("Perlu akun untuk mengecek sertifikat?", { exact: true })
    .click();
  await expect(
    page.getByText(/Tidak\. Siapa pun yang memegang link/),
  ).toBeVisible();
});
test("keberatan merupakan layar konsep dengan tombol dan field nonaktif", async ({
  page,
}) => {
  await page.goto("/proses-keberatan");
  await expect(
    page.getByText("Konsep — belum bisa diajukan lewat aplikasi", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ajukan sampling ulang (segera hadir)" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Alasan keberatan")).toBeDisabled();
});

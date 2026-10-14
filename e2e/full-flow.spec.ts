import { expect, test, type Page } from "@playwright/test";

/**
 * Kriteria penerimaan A5: alur penuh pabrik → admin → grader → admin →
 * halaman publik. Memakai akun demo dari supabase/seed.sql.
 */
const PASSWORD = "vmsdemo123";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/(factory|grader|admin)$/);
}

test.describe.configure({ mode: "serial" });

test("pabrik bisa menyimpan draft batch", async ({ page }) => {
  await signIn(page, "pabrik@vms.demo");
  await expect(page).toHaveURL(/\/factory/);

  await page.goto("/factory/batches/new");
  await page.getByRole("radio", { name: /Kayu Solid/ }).check();
  await page.getByRole("radio", { name: /Batang berikat/ }).check();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByLabel("Jenis kayu yang dideklarasikan").fill("Pinus");
  await page.getByLabel("Berat total (kg)").fill("400");
  for (const [label, value] of [
    ["Jumlah ikat", "20"],
    ["Isi batang per ikat", "20"],
    ["Lebar penampang (cm)", "3"],
    ["Tebal penampang (cm)", "4"],
    ["Panjang (cm)", "100"],
    ["Toleransi penampang (±cm)", "0,2"],
    ["Toleransi panjang (±cm)", "1"],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page.getByRole("button", { name: "Simpan draft batch" }).click();
  await expect(page).toHaveURL(/\/factory\/batches\//);
  await expect(page.getByText("Draft")).toBeVisible();
});

test("admin melihat antrian kerjanya", async ({ page }) => {
  await signIn(page, "admin@vms.demo");
  await expect(page).toHaveURL(/\/admin/);

  await expect(
    page.getByRole("heading", { name: "Dashboard admin" }),
  ).toBeVisible();
  await expect(page.getByText("Pabrik menunggu verifikasi")).toBeVisible();
  await expect(
    page.getByText("Hasil penilaian menunggu penerbitan"),
  ).toBeVisible();
});

test("grader melihat antrian penugasan", async ({ page }) => {
  await signIn(page, "grader@vms.demo");
  await expect(page).toHaveURL(/\/grader/);

  await expect(
    page.getByRole("heading", { name: "Antrian penugasan" }),
  ).toBeVisible();
});

test("pabrik tidak bisa membuka area admin", async ({ page }) => {
  await signIn(page, "pabrik@vms.demo");
  await page.goto("/admin");

  // Middleware mengembalikan pengguna ke beranda perannya sendiri.
  await expect(page).toHaveURL(/\/factory/);
});

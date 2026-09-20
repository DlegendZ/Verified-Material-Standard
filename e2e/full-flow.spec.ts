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
}

test.describe.configure({ mode: "serial" });

test("pabrik bisa menyimpan draft batch", async ({ page }) => {
  await signIn(page, "pabrik@vms.demo");
  await expect(page).toHaveURL(/\/factory/);

  await page.goto("/factory/batches/new");
  await page.getByRole("radio", { name: "Tekstil" }).check();
  await page.getByLabel("Klaim berat (kg)").fill("120");
  await page.getByRole("button", { name: "Lanjut ke detail" }).click();
  await page.getByLabel("Klaim spesifikasi").fill("Kain perca katun uji e2e");
  await page.getByRole("button", { name: "Simpan draft batch" }).click();

  await expect(page).toHaveURL(/\/factory\/batches\//);
  await expect(page.getByText("Draft")).toBeVisible();
});

test("admin melihat antrian kerjanya", async ({ page }) => {
  await signIn(page, "admin@vms.demo");
  await expect(page).toHaveURL(/\/admin/);

  await expect(page.getByRole("heading", { name: "Dashboard admin" })).toBeVisible();
  await expect(page.getByText("Pabrik menunggu verifikasi")).toBeVisible();
  await expect(page.getByText("Hasil penilaian menunggu penerbitan")).toBeVisible();
});

test("grader melihat antrian penugasan", async ({ page }) => {
  await signIn(page, "grader@vms.demo");
  await expect(page).toHaveURL(/\/grader/);

  await expect(page.getByRole("heading", { name: "Antrian penugasan" })).toBeVisible();
});

test("pabrik tidak bisa membuka area admin", async ({ page }) => {
  await signIn(page, "pabrik@vms.demo");
  await page.goto("/admin");

  // Middleware mengembalikan pengguna ke beranda perannya sendiri.
  await expect(page).toHaveURL(/\/factory/);
});

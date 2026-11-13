import { expect, test, type Page } from "@playwright/test";

/**
 * Kriteria penerimaan A5: alur penuh pabrik → admin → grader → admin →
 * halaman publik. Memakai akun demo dari supabase/seed.sql.
 */
const PASSWORD = "vmsdemo123";

function blankPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 4\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/(factory|grader|admin)$/);
}

test.describe.configure({ mode: "serial" });

test("pabrik bisa menyimpan draft, mengunggah PDF dan menghapus draft", async ({
  page,
}) => {
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
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();

  for (const [label, link] of [
    ["Unggah dokumen asal-usul", "Dokumen asal-usul · PDF"],
    ["Unggah hasil uji lab", "Hasil uji lab · PDF"],
    ["Unggah dokumen lain", "Dokumen lain · PDF"],
  ]) {
    await page
      .locator(`input[type=file][aria-label="${label}"]`)
      .setInputFiles({
        name: "sample.pdf",
        mimeType: "application/pdf",
        buffer: blankPdf(),
      });
    const attachment = page.getByRole("link", { name: link });
    await expect(attachment).toBeVisible();
    const response = await page.request.get(
      (await attachment.getAttribute("href"))!,
    );
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }

  const code = await page.getByRole("heading", { level: 1 }).innerText();
  await page.getByRole("button", { name: "Hapus draft", exact: true }).click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("heading", { name: code })).toBeVisible();
  await page.getByRole("button", { name: "Hapus draft", exact: true }).click();
  await page.getByRole("button", { name: "Ya, hapus draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Draft berhasil dihapus.");
  await expect(page.getByRole("link", { name: new RegExp(code) })).toHaveCount(
    0,
  );
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

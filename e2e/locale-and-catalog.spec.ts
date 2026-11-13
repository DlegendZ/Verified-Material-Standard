import { expect, test } from "@playwright/test";

test("English persists across navigation and switches back to Indonesian", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: /Material quality/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse verified materials" }).click();
  await expect(
    page.getByRole("heading", { name: "Verified materials", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("Jepara");
  await page.getByLabel("Grade", { exact: true }).selectOption("A");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Jepara&grade=A/);
  await page.reload();
  await expect(page.getByLabel("Grade", { exact: true })).toHaveValue("A");
  await page.getByRole("button", { name: "Switch to Indonesian" }).click();
  await expect(
    page.getByRole("heading", { name: "Material terverifikasi", exact: true }),
  ).toBeVisible();
});

test("the how-it-works link retains AA contrast when hovered in dark mode", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ganti ke mode gelap" }).click();
  const link = page.getByRole("link", { name: "Lihat cara kerja" });
  await link.hover();
  await expect
    .poll(() =>
      link.evaluate((node) => {
        const style = getComputedStyle(node);
        const luminance = (color: string) => {
          const channels =
            color
              .match(/[\d.]+/g)
              ?.slice(0, 3)
              .map((n) => Number(n) / 255) ?? [];
          return channels
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce(
              (sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i],
              0,
            );
        };
        const pair = [luminance(style.color), luminance(style.backgroundColor)];
        return (Math.max(...pair) + 0.05) / (Math.min(...pair) + 0.05);
      }),
    )
    .toBeGreaterThanOrEqual(4.5);
});

import { defineConfig, devices } from "@playwright/test";

/**
 * E2E happy path. Butuh database yang sudah di-seed:
 *   supabase db reset && npm run seed:demo
 *
 * Dev server dijalankan otomatis oleh Playwright. Tidak ada konfigurasi CI di
 * sini — lapisan itu dikerjakan manusia (SRD Bab 12).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

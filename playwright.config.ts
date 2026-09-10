import { defineConfig, devices } from "@playwright/test";

/**
 * See e2e/README.md for prerequisites — these specs exercise the running
 * app against a REAL Supabase backend (hosted project or `supabase start`)
 * seeded with `npm run db:seed:demo`. They cannot run against this repo's
 * Docker-less local dev shim (db/local_dev_shim.sql), which only emulates
 * enough of `auth`/`storage` for direct-SQL RLS testing.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile-.*\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against an already-running Nightcap instance — it never starts the
 * app itself (no `webServer` block). Point it at your dev server (or a
 * tunnel like ngrok) via BASE_URL; defaults to the local dev port.
 *
 *   pnpm test:e2e                                  # http://localhost:3500
 *   $env:BASE_URL="https://nightcap.ngrok.app"; pnpm test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared demo-host data — tests should not race each other
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3500",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

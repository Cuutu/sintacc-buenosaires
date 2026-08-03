import { defineConfig, devices } from "@playwright/test"

/**
 * E2E preferí `next start` (build prod), no `next dev`.
 * Hermético local: NEXTAUTH_SECRET de test + page.route fixtures 200 (cero 500 happy-path).
 *
 * PLAYWRIGHT_BASE_URL — override
 * PLAYWRIGHT_SKIP_WEBSERVER=1 — servidor externo
 * PLAYWRIGHT_E2E_LEVEL=hermetic|staging (default hermetic)
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000"
const isCI = !!process.env.CI
const e2eLevel = process.env.PLAYWRIGHT_E2E_LEVEL || "hermetic"

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  metadata: { e2eLevel },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npx next start -H 127.0.0.1 -p 3000",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          ...process.env,
          // Secret exclusivo testing — nunca credencial productiva
          NEXTAUTH_SECRET:
            process.env.E2E_NEXTAUTH_SECRET || "e2e-hermetic-secret-not-for-production",
          NEXTAUTH_URL: process.env.E2E_NEXTAUTH_URL || baseURL,
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 390, height: 844 } },
    },
  ],
})

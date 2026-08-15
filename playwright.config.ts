import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://127.0.0.1:3100";
const externalServer = Boolean(process.env.E2E_BASE_URL?.trim());

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    locale: "id-ID",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: externalServer
    ? undefined
    : {
        command: "node_modules\\.bin\\next.CMD dev -p 3100",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: { ...process.env, PORT: "3100" }
      }
});

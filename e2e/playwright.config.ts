import { defineConfig } from "@playwright/test";

const databasePath =
  process.env.BUDGET_DATABASE_PATH ?? "/tmp/twogether-e2e.sqlite";
const baseURL = "http://127.0.0.1:3000";

const env = { ...process.env };
delete env.TURSO_DATABASE_URL;
delete env.TURSO_AUTH_TOKEN;
delete env.RESEND_API_KEY;

export default defineConfig({
  testDir: "./specs",
  outputDir: "../test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `rm -f "${databasePath}" "${databasePath}-wal" "${databasePath}-shm" && bun run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...env,
      BUDGET_DATABASE_PATH: databasePath,
      NODE_ENV: "development",
    },
  },
});

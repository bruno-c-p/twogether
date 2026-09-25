import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath =
  process.env.BUDGET_DATABASE_PATH ?? "/tmp/twogether-e2e.sqlite";
const port = process.env.E2E_PORT ?? "3400";
const baseURL = `http://127.0.0.1:${port}`;

const env = { ...process.env };
delete env.TURSO_DATABASE_URL;
delete env.TURSO_AUTH_TOKEN;

export default defineConfig({
  testDir: "./specs",
  outputDir: "../test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  retries: process.env.CI ? 1 : 0,
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
      name: "setup",
      testDir: ".",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { browserName: "chromium" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    cwd: root,
    // The suite runs the production build, not `vite dev`: the dev SSR module
    // runner races on server-function modules (undefined middleware, then a
    // poisoned module graph) and has been failing CI intermittently. The build
    // is the artifact we ship, so this both stabilizes the run and tests prod.
    command: `rm -f "${databasePath}" "${databasePath}-wal" "${databasePath}-shm" && bun run build && NODE_ENV=production HOST=127.0.0.1 PORT=${port} node .output/server/index.mjs`,
    // A static asset, not "/": the app root renders SSR, so a failing Clerk or
    // database request would look like a server that never booted.
    url: `${baseURL}/manifest.webmanifest`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...env,
      BUDGET_DATABASE_PATH: databasePath,
    },
  },
});

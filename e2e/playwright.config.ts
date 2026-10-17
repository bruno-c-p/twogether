import { config } from "dotenv";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

config({ path: ".env.local" });

process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const databasePath =
  process.env.E2E_DATABASE_PATH ??
  join(mkdtempSync(join(tmpdir(), "twogether-e2e-")), "budget.sqlite");

// Workers and retries share this run's throwaway database, never the app's.
process.env.E2E_DATABASE_PATH = databasePath;

function canListen(port: number, host?: string) {
  return new Promise<boolean>((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

// On macOS a wildcard listener leaves 127.0.0.1 bindable and a loopback
// listener leaves the wildcard bindable, so a port is free only if both bind.
async function isFree(port: number) {
  return (await canListen(port)) && (await canListen(port, "127.0.0.1"));
}

// Worktrees run e2e side by side. Starting at a random port in the range
// keeps simultaneous runs from probing, and picking, the same one first.
// Workers inherit the choice through the environment.
async function freePort() {
  const start = Math.floor(Math.random() * 100);

  for (let step = 0; step < 100; step += 1) {
    const port = 3400 + ((start + step) % 100);

    if (await isFree(port)) return String(port);
  }

  throw new Error("No free e2e port in 3400-3499");
}

process.env.E2E_PORT ??= await freePort();

const port = process.env.E2E_PORT;

const baseURL = `http://127.0.0.1:${port}`;

const env = { ...process.env };

env.TURSO_DATABASE_URL = "";

env.TURSO_AUTH_TOKEN = "";

export default defineConfig({
  testDir: "./specs",
  // Per port, so side-by-side runs never clean up each other's traces.
  outputDir: `../test-results/${port}`,
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
    command: `(test -f .output/server/index.mjs || bun run build) && NODE_ENV=production HOST=127.0.0.1 PORT=${port} node .output/server/index.mjs`,
    // A static asset, not "/": the app root renders SSR, so a failing Clerk or
    // database request would look like a server that never booted.
    url: `${baseURL}/manifest.webmanifest`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...env,
      BUDGET_DATABASE_PATH: databasePath,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    },
  },
});

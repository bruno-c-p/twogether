#!/usr/bin/env bun
// verify-twogether helper: launch, doctor, drive, cleanup. Usage is in ../SKILL.md.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createClerkClient } from "@clerk/backend";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import {
  chromium,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { parse } from "dotenv";

const ROOT = resolve(import.meta.dir, "../../../..");
const EVIDENCE_HOME = join(homedir(), ".local/state/twogether-verify");
const SCRATCH_PREFIX = join(realpathSync(tmpdir()), "twogether-verify-");
const PORTS = { from: 3500, count: 100 };
const SERVER_ENTRY = ".output/server/index.mjs";

// Existing e2e Clerk users (uniqueEmail of these spec titles). The dev
// instance is at its user quota: these are looked up, never created.
const USERS = {
  solo: ["M7 receita and despesa land on the month overview", "ana"],
  ana: ["M15 partner settles a split rent with repayment entries", "ana"],
  bia: ["M15 partner settles a split rent with repayment entries", "bia"],
} as const;

type Who = keyof typeof USERS;

const viewports = {
  phone: { width: 320, height: 720 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

interface Run {
  dir: string;
  port: number;
  baseURL: string;
  pid: number;
  scratch: string;
  database: string;
  log: string;
  source: string;
  launchedAt: string;
  cleanedAt?: string;
}

function email(who: Who) {
  const [title, label] = USERS[who];
  const key = createHash("sha1")
    .update(`chromium:${title}`)
    .digest("hex")
    .slice(0, 12);

  return `e2e.${key}.${label}+clerk_test@example.com`;
}

function devEnv(): Record<string, string> {
  const file = join(ROOT, ".env.local");

  if (!existsSync(file))
    throw new Error(".env.local is missing: run `bun run setup` first.");
  const env = parse(readFileSync(file));

  if (/sk_live_|pk_live_/.test(Object.values(env).join("\n")))
    throw new Error(".env.local holds live Clerk keys; refusing to run.");

  if (!env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
    throw new Error("CLERK_SECRET_KEY in .env.local is not a sk_test_ key.");

  return {
    ...env,
    CLERK_PUBLISHABLE_KEY:
      env.CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY,
  };
}

// The build the server runs must match the tree being verified.
function sourceDigest() {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
  const paths = ["src", "public", "vite.config.ts", "uno.config.ts"];

  return createHash("sha1")
    .update(git("rev-parse", "HEAD"))
    .update(git("diff", "HEAD", "--", ...paths))
    .update(git("ls-files", "--others", "--exclude-standard", "--", ...paths))
    .digest("hex");
}

function canListen(port: number, host?: string) {
  return new Promise<boolean>((done) => {
    const server = createServer();

    server.once("error", () => done(false));
    server.listen(port, host, () => server.close(() => done(true)));
  });
}

async function freePort() {
  const start = Math.floor(Math.random() * PORTS.count);

  for (let step = 0; step < PORTS.count; step += 1) {
    const port = PORTS.from + ((start + step) % PORTS.count);

    if ((await canListen(port)) && (await canListen(port, "127.0.0.1")))
      return port;
  }

  throw new Error(`No free port in ${PORTS.from}-${PORTS.from + 99}`);
}

function readRun(dir: string | undefined): Run {
  if (!dir) throw new Error("Pass the run directory printed by `launch`.");
  const file = join(resolve(dir), "run.json");

  if (!existsSync(file)) throw new Error(`${file} does not exist.`);

  return JSON.parse(readFileSync(file, "utf8"));
}

function writeRun(run: Run) {
  writeFileSync(join(run.dir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
}

function alive(pid: number) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

function command(pid: number) {
  try {
    return execFileSync("ps", ["-o", "command=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function listener(port: number) {
  try {
    return execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

function ours(run: Run) {
  return alive(run.pid) && command(run.pid).includes(SERVER_ENTRY);
}

async function fetchOk(url: string, text?: string) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const body = await response.text();

    return response.status === 200 && (!text || body.includes(text));
  } catch {
    return false;
  }
}

async function ready(run: Run) {
  return (
    (await fetchOk(`${run.baseURL}/manifest.webmanifest`)) &&
    (await fetchOk(`${run.baseURL}/entrar`, "twogether — Orçamento a dois"))
  );
}

async function launch(args: string[]) {
  const env = devEnv();

  if (!args.includes("--no-build"))
    execFileSync("bun", ["run", "build"], { cwd: ROOT, stdio: "inherit" });

  if (!existsSync(join(ROOT, SERVER_ENTRY)))
    throw new Error(`${SERVER_ENTRY} is missing: run without --no-build.`);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(EVIDENCE_HOME, stamp);

  mkdirSync(dir, { recursive: true });
  const scratch = mkdtempSync(SCRATCH_PREFIX);
  const port = await freePort();
  const log = join(scratch, "server.log");
  const out = openSync(log, "a");

  const server = spawn("node", [SERVER_ENTRY], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    env: {
      ...process.env,
      ...env,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      BUDGET_DATABASE_PATH: join(scratch, "budget.sqlite"),
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
    },
  });

  server.unref();

  if (!server.pid) throw new Error("The server did not start.");

  const run: Run = {
    dir,
    port,
    baseURL: `http://127.0.0.1:${port}`,
    pid: server.pid,
    scratch,
    database: join(scratch, "budget.sqlite"),
    log,
    source: sourceDigest(),
    launchedAt: new Date().toISOString(),
  };

  writeRun(run);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await ready(run)) {
      console.log(`ready ${run.baseURL}`);
      console.log(`RUN=${dir}`);

      return;
    }

    if (!alive(run.pid)) break;
    await Bun.sleep(500);
  }

  console.error(readFileSync(log, "utf8").slice(-4000));
  throw new Error(`Server never became ready. Run: cleanup ${dir}`);
}

async function doctor(dir: string | undefined) {
  const run = readRun(dir);
  const checks: Array<[string, boolean]> = [];
  const check = (label: string, ok: boolean) => checks.push([label, ok]);

  check("not cleaned up", !run.cleanedAt);
  check(
    `port ${run.port} is ours (3500-3599, never 3000)`,
    run.port !== 3000 && run.port >= PORTS.from && run.port < 3600,
  );
  check(
    "database is in this run's scratch dir, not data/",
    run.database.startsWith(SCRATCH_PREFIX) &&
      !run.database.startsWith(join(ROOT, "data")),
  );
  check(`pid ${run.pid} is our ${SERVER_ENTRY}`, ours(run));
  check(
    `port ${run.port} listener is pid ${run.pid}`,
    listener(run.port).includes(run.pid),
  );
  check("serves /manifest.webmanifest and /entrar", await ready(run));
  check(
    "build matches the working tree (else cleanup + launch)",
    run.source === sourceDigest(),
  );
  const env = devEnv();
  const client = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  for (const who of Object.keys(USERS) as Who[]) {
    const found = await client.users
      .getUserList({ emailAddress: [email(who)] })
      .then((list) => list.data.length === 1)
      .catch(() => false);

    check(`Clerk test user "${who}" exists (${email(who)})`, found);
  }

  for (const [label, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  const healthy = checks.every(([, ok]) => ok);

  console.log(healthy ? "doctor: healthy" : "doctor: NOT healthy");

  return healthy;
}

async function cleanup(dir: string | undefined) {
  const run = readRun(dir);

  if (ours(run)) {
    process.kill(-run.pid, "SIGTERM");

    for (let attempt = 0; attempt < 20 && alive(run.pid); attempt += 1)
      await Bun.sleep(250);

    if (alive(run.pid)) process.kill(-run.pid, "SIGKILL");
    console.log(`stopped pid ${run.pid} (port ${run.port})`);
  } else if (alive(run.pid)) {
    console.log(`pid ${run.pid} is no longer our server; left it alone`);
  }

  if (existsSync(run.log)) copyFileSync(run.log, join(run.dir, "server.log"));

  if (run.scratch.startsWith(SCRATCH_PREFIX) && existsSync(run.scratch)) {
    rmSync(run.scratch, { recursive: true, force: true });
    console.log(`removed scratch ${run.scratch}`);
  }

  run.cleanedAt = new Date().toISOString();
  writeRun(run);
  console.log(`evidence kept in ${run.dir}`);
}

export interface Kit {
  page: Page;
  evidence: string;
  expect: typeof expect;
  newPage: () => Promise<Page>;
  step: (label: string) => void;
  onboard: (page: Page, who: Who, name: string) => Promise<void>;
  invitePartner: (owner: Page, who: Who, name: string) => Promise<Page>;
  setMonth: (page: Page, month: string) => Promise<void>;
  reload: (page: Page) => Promise<void>;
  shot: (page: Page, name: string) => Promise<void>;
  sweep: (page: Page, name: string) => Promise<void>;
}

async function hydrated(page: Page) {
  await page.waitForFunction(
    () =>
      document.body !== null &&
      Object.keys(document.body).some((key) => key.startsWith("__react")),
  );
}

async function drive(dir: string | undefined, journeyPath: string | undefined) {
  const run = readRun(dir);

  if (!journeyPath) throw new Error("Pass a journey file.");

  if (!(await doctor(dir))) throw new Error("Doctor failed; not driving.");
  const env = devEnv();

  Object.assign(process.env, env);
  await clerkSetup();
  const client = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const name = basename(journeyPath).replace(/\.ts$/, "");
  const evidence = join(run.dir, name);

  mkdirSync(evidence, { recursive: true });
  const transcript = join(evidence, "transcript.md");
  const problems: string[] = [];
  const noise: string[] = [];
  const contexts: BrowserContext[] = [];
  const browser = await chromium.launch();

  const step = (label: string) => {
    appendFileSync(transcript, `- ${new Date().toISOString()} ${label}\n`);
    console.log(`step: ${label}`);
  };

  const watch = (page: Page) => {
    page.on("console", (message) => {
      if (message.type() === "error")
        problems.push(`console error ${page.url()}: ${message.text()}`);
    });
    page.on("pageerror", (error) =>
      problems.push(`page error ${page.url()}: ${error.message}`),
    );
    page.on("requestfailed", (request) => {
      const line = `${request.failure()?.errorText} ${request.method()} ${request.url()}`;

      // Navigations cancel in-flight fetches; that is not a failure.
      if (request.failure()?.errorText === "net::ERR_ABORTED") noise.push(line);
      else problems.push(`request failed ${line}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        problems.push(
          `HTTP ${response.status()} ${response.request().method()} ${response.url()}`,
        );
    });
  };

  const newPage = async () => {
    const context = await browser.newContext({
      baseURL: run.baseURL,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: viewports.desktop,
      colorScheme: "light",
      permissions: ["clipboard-read", "clipboard-write"],
    });

    contexts.push(context);
    context.on("page", watch);

    return context.newPage();
  };

  const shot = async (page: Page, label: string) => {
    await page.screenshot({ path: join(evidence, `${label}.png`), fullPage: true });
    writeFileSync(
      join(evidence, `${label}.aria.yml`),
      await page.locator("body").ariaSnapshot(),
    );
  };

  const kit: Kit = {
    page: await newPage(),
    evidence,
    expect,
    newPage,
    step,
    shot,
    reload: async (page) => {
      await page.reload();
      await hydrated(page);
    },
    onboard: async (page, who, personName) => {
      const user = (
        await client.users.getUserList({ emailAddress: [email(who)] })
      ).data[0];

      if (!user)
        throw new Error(`${email(who)} is missing; never create Clerk users.`);
      await setupClerkTestingToken({ page });
      const path = new URL(page.url()).pathname;

      if (!path.startsWith("/convite/") && !path.startsWith("/entrar"))
        await page.goto("/entrar");
      await expect(page.getByRole("heading", { name: /A vida a dois/ })).toBeVisible();
      await hydrated(page);
      const token = await client.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 600,
      });

      await clerk.signIn({
        page,
        signInParams: { strategy: "ticket", ticket: token.token },
      });
      await expect(
        page.getByRole("heading", { name: /Como chamamos você\?|Vamos começar,/ }),
      ).toBeVisible({ timeout: 20_000 });
      await hydrated(page);
      const field = page.getByLabel("Seu nome");

      if (await field.isVisible()) {
        await field.fill(personName);
        await page.getByRole("button", { name: "Continuar" }).click();
      }

      if (path.startsWith("/convite/")) return;
      await page.getByRole("button", { name: "Começar nosso orçamento" }).click();
      await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    },
    invitePartner: async (owner, who, personName) => {
      await owner.getByRole("button", { name: /Abrir nosso espaço/ }).click();
      await owner.getByRole("button", { name: "Gerar convite" }).click();
      const link = await owner.getByLabel("Link para seu par").inputValue();

      await owner.getByRole("button", { name: "Fechar", exact: true }).click();
      const partner = await newPage();

      await partner.goto(link);
      await kit.onboard(partner, who, personName);
      await partner.getByRole("button", { name: "Aceitar convite" }).click();
      await expect(partner.getByRole("heading", { name: "Visão geral" })).toBeVisible();
      await kit.reload(owner);

      return partner;
    },
    setMonth: async (page, month) => {
      const [year, number] = month.split("-").map(Number);
      const label = `${new Date(year, number - 1, 1).toLocaleDateString("pt-BR", { month: "long" })} ${year}`;
      const trigger = page.getByRole("button", { name: /^Selecionar mês e ano/ });

      await trigger.click();
      const shown = page.getByRole("dialog").locator("strong[aria-live]");

      while (Number(await shown.textContent()) !== year)
        await page
          .getByRole("button", {
            name: Number(await shown.textContent()) < year ? "Próximo ano" : "Ano anterior",
          })
          .click();
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(trigger).toHaveAccessibleName(`Selecionar mês e ano: ${label}`);
    },
    sweep: async (page, label) => {
      for (const [size, viewport] of Object.entries(viewports))
        for (const theme of ["light", "dark"] as const) {
          await page.setViewportSize(viewport);
          await page.emulateMedia({ colorScheme: theme });
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          const width = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            inner: window.innerWidth,
          }));

          if (width.scroll > width.inner)
            problems.push(
              `horizontal overflow on ${label} at ${size}/${theme}: ${width.scroll}px > ${width.inner}px`,
            );
          await shot(page, `${label}-${size}-${theme}`);
        }
      await page.setViewportSize(viewports.desktop);
      await page.emulateMedia({ colorScheme: "light" });
    },
  };

  step(`journey ${journeyPath} against ${run.baseURL}`);
  let failure: unknown;

  try {
    const journey = await import(resolve(journeyPath));

    await journey.default(kit);
  } catch (error) {
    failure = error;
    step(`FAILED: ${error instanceof Error ? error.message : String(error)}`);

    for (const [index, context] of contexts.entries())
      for (const page of context.pages())
        await page
          .screenshot({ path: join(evidence, `failure-${index}.png`), fullPage: true })
          .catch(() => undefined);
  } finally {
    await browser.close();
  }

  writeFileSync(
    join(evidence, "problems.json"),
    `${JSON.stringify({ problems, noise }, null, 2)}\n`,
  );
  for (const problem of problems) console.log(`problem: ${problem}`);
  const passed = !failure && problems.length === 0;

  step(passed ? "PASSED" : "FAILED");
  console.log(`evidence ${evidence}`);

  if (failure) throw failure;

  return passed;
}

async function main() {
  const [subcommand, ...args] = process.argv.slice(2);

  if (subcommand === "launch") return launch(args);

  if (subcommand === "doctor") return (await doctor(args[0])) || process.exit(1);

  if (subcommand === "drive")
    return (await drive(args[0], args[1])) || process.exit(1);

  if (subcommand === "cleanup") return cleanup(args[0]);
  console.error("usage: verify.ts launch [--no-build] | doctor <run> | drive <run> <journey.ts> | cleanup <run>");
  process.exit(2);
}

if (import.meta.main)
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

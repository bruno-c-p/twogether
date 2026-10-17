import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import {
  boundaryBaselineGrowth,
  headerCheckFailure,
  headerFailures,
  sourceChecks,
  waitForHeader,
  type Git,
  type Repo,
} from "./fitness-checks";

const boundAddressSchema = z.object({ port: z.number() });

const SERVER_ENTRIES = [
  ".output/server/index.mjs",
  ".output/server/index.js",
  "dist/server/index.mjs",
  "dist/server/index.js",
];

const repo: Repo = {
  tracked: (patterns) =>
    execFileSync("git", ["ls-files", "--", ...patterns], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean),
  read: (file) => readFileSync(file, "utf8"),
  exists: (file) => existsSync(file),
};

async function freePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = boundAddressSchema.safeParse(server.address());

      if (!address.success) {
        server.close();
        reject(new Error("could not bind an ephemeral port"));

        return;
      }

      const { port } = address.data;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function productionEnv(port: number) {
  return {
    ...process.env,
    PORT: String(port),
    NITRO_PORT: String(port),
    NITRO_HOST: "127.0.0.1",
    HOST: "127.0.0.1",
    NODE_ENV: "production" as const,
    BUDGET_DATABASE_PATH: ":memory:",
    // Clerk middleware boots on every request, so a keyless environment
    // would answer 500 before this header exists. Placeholders only keep the
    // middleware alive for the header check; real keys win when configured.
    CLERK_SECRET_KEY:
      process.env.CLERK_SECRET_KEY ||
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV",
    CLERK_PUBLISHABLE_KEY:
      process.env.CLERK_PUBLISHABLE_KEY ||
      "pk_test_ZmFrZS1jbGVyay5leGFtcGxlLmNvbSQ=",
  };
}

const git: Git = (args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const headerProbe = {
  fetch: (url: string) =>
    fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    }),
  sleep,
  now: () => Date.now(),
};

async function builtHeaderFailures(entry: string) {
  const port = await freePort();

  const child = spawn("bun", [entry], {
    env: productionEnv(port),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";

  const collect = (chunk: Buffer) => {
    output += chunk.toString();
  };

  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);

  try {
    const header = await waitForHeader(
      `http://127.0.0.1:${port}/`,
      20_000,
      headerProbe,
    );

    const failures = headerFailures(header);

    if (!failures.length) console.log(`HEAD / Cache-Control: ${header}`);

    return failures;
  } catch (cause) {
    return [headerCheckFailure(cause, output)];
  } finally {
    child.kill("SIGKILL");
  }
}

async function builtHeaderChecks() {
  const entry = SERVER_ENTRIES.find((file) => existsSync(file));

  if (!entry)
    return [
      "build output server entry not found (.output/server or dist/server)",
    ];

  return builtHeaderFailures(entry);
}

const failures = process.argv.includes("--headers")
  ? await builtHeaderChecks()
  : [
      ...sourceChecks(repo),
      ...boundaryBaselineGrowth(repo, git, (message) => console.warn(message)),
    ];

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

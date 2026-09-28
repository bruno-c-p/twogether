import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

const failures: string[] = [];

const apiBudget = ["/api", "budget"].join("/");

const cacheControl = "private, no-store";

const resurrectedCss = [
  "src/ui.module.css",
  "src/features/budget/styles/list-row.module.css",
];

const bannedCssDeps = ["tailwindcss", "shadcn"];

const cacheControlFiles = ["src/start.ts"] as const;

const dependencyMap = z.record(z.string(), z.string()).optional();

const packageJsonSchema = z.object({
  dependencies: dependencyMap,
  devDependencies: dependencyMap,
  peerDependencies: dependencyMap,
});

const boundAddressSchema = z.object({ port: z.number() });

function fail(message: string) {
  failures.push(message);
}

function tracked(args: string[]) {
  const out = execFileSync("git", ["ls-files", "--", ...args], {
    encoding: "utf8",
  });

  return out.split("\n").filter(Boolean);
}

function sourceFiles() {
  return tracked(["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"]).filter(
    (file) => file !== "scripts/fitness.ts",
  );
}

function assertNoGithubMedia() {
  const files = tracked([".github"]).filter((file) =>
    /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i.test(file),
  );

  if (files.length)
    fail(`image/video files under .github/:\n${files.join("\n")}`);
}

function assertComponentModuleLayout() {
  for (const file of tracked(["src"])) {
    if (!file.endsWith(".module.css")) continue;
    const parts = file.split("/");
    const base = parts.at(-1) ?? "";
    const stem = base.replace(/\.module\.css$/, "");
    const folder = parts.at(-2) ?? "";

    if (folder !== stem) {
      fail(`${file} must live in a folder named ${stem}`);
      continue;
    }

    const sibling = [...parts.slice(0, -1), `${stem}.tsx`].join("/");

    if (!existsSync(sibling))
      fail(`${file} has no sibling ${stem}.tsx in ${folder}/`);
  }
}

function assertNoBudgetCommandBus() {
  const files = tracked([]);

  for (const file of files) {
    if (file.endsWith("api.server.ts")) fail(`tracked ${file}`);

    if (file === "src/routes/api" || file.startsWith("src/routes/api/"))
      fail(`tracked API route ${file}`);
  }

  for (const file of sourceFiles()) {
    const text = readFileSync(file, "utf8");

    if (text.includes(apiBudget)) fail(`${file} mentions ${apiBudget}`);

    if (text.includes("createAPIFileRoute"))
      fail(`${file} mentions createAPIFileRoute`);

    if (/\bmutateBudget\b/.test(text)) fail(`${file} still has mutateBudget`);

    if (/\bparseBudgetCommand\b/.test(text))
      fail(`${file} still has parseBudgetCommand`);

    if (/\bBudgetCommand\b/.test(text)) fail(`${file} still has BudgetCommand`);

    if (/\bCommandResult\b/.test(text)) fail(`${file} still has CommandResult`);

    if (
      (file.endsWith(".functions.ts") ||
        (file.includes("/actions/") &&
          file.endsWith(".ts") &&
          !file.endsWith(".test.ts"))) &&
      /action:\s*["']/.test(text)
    )
      fail(`${file} still uses an action discriminator in a server fn`);
  }
}

function assertCacheControlSource() {
  for (const file of cacheControlFiles) {
    if (!existsSync(file)) {
      fail(`${file} is required for CSRF and Cache-Control middleware`);
      continue;
    }

    const text = readFileSync(file, "utf8");

    if (!text.includes("createCsrfMiddleware"))
      fail(`${file} must keep createCsrfMiddleware`);

    if (!text.includes(cacheControl))
      fail(`${file} must set Cache-Control: ${cacheControl}`);
  }
}

function assertCssHouseStyle() {
  const pkg = packageJsonSchema.parse(
    JSON.parse(readFileSync("package.json", "utf8")),
  );

  const names = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  });

  for (const name of names) {
    if (bannedCssDeps.includes(name) || name.startsWith("@radix-ui/"))
      fail(`package.json must not depend on ${name}`);
  }

  if (!names.includes("unocss")) fail("package.json must depend on unocss");

  for (const file of tracked(resurrectedCss))
    fail(`tracked resurrected ${file}`);

  const gradient =
    /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|--page-glow\b/;

  for (const file of tracked(["*.css", "*.svg", "*.tsx", "*.ts", "*.html"])) {
    if (file === "scripts/fitness.ts") continue;

    if (gradient.test(readFileSync(file, "utf8")))
      fail(`${file} still uses a CSS gradient or --page-glow`);
  }
}

function assertUnoWiring() {
  if (!existsSync("uno.config.ts")) {
    fail("uno.config.ts is required for the styling system");

    return;
  }

  const config = readFileSync("uno.config.ts", "utf8");

  if (/\bfontFamily\s*:/.test(config))
    fail("uno.config.ts must set theme.font; preset-wind4 ignores fontFamily");
  const root = readFileSync("src/routes/__root.tsx", "utf8");

  if (!root.includes("virtual:uno.css"))
    fail("src/routes/__root.tsx must import virtual:uno.css");
}

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
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function serverEntry() {
  const candidates = [
    ".output/server/index.mjs",
    ".output/server/index.js",
    "dist/server/index.mjs",
    "dist/server/index.js",
  ];

  return candidates.find((file) => existsSync(file));
}

async function waitForHeader(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });

      return response.headers.get("cache-control") ?? "";
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      await sleep(200);
    }
  }

  throw new Error(`server at ${url} did not respond: ${last}`);
}

async function assertBuiltHeaders() {
  const entry = serverEntry();

  if (!entry) {
    fail("build output server entry not found (.output/server or dist/server)");

    return;
  }

  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;

  const child = spawn("bun", [entry], {
    env: {
      ...process.env,
      PORT: String(port),
      NITRO_PORT: String(port),
      NITRO_HOST: "127.0.0.1",
      HOST: "127.0.0.1",
      NODE_ENV: "production",
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
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  try {
    const header = await waitForHeader(url, 20_000);

    if (header !== cacheControl)
      fail(
        `GET / Cache-Control is ${JSON.stringify(header)}, expected ${cacheControl}`,
      );
    else console.log(`HEAD / Cache-Control: ${header}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(output ? `${detail}\n${output}` : detail);
  } finally {
    child.kill("SIGKILL");
  }
}

const afterBuild = process.argv.includes("--headers");

if (afterBuild) {
  await assertBuiltHeaders();
} else {
  assertNoGithubMedia();
  assertNoBudgetCommandBus();
  assertCacheControlSource();
  assertCssHouseStyle();
  assertUnoWiring();
  assertComponentModuleLayout();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const LIVE_CLERK_KEY = /[sp]k_live_/;

const LOCAL_DATABASE = /^(?::memory:|file:[^$`]*|[^:$`]*)$/;

const DATABASE_KEYS = new Set(["TURSO_DATABASE_URL", "BUDGET_DATABASE_PATH"]);

export type SetupState = {
  isMainCheckout: boolean;
  source: string;
  sourceIsLocalEnv: boolean;
  sourceContents: string | undefined;
  localEnvIsFile: boolean;
};

function databaseUrls(contents: string) {
  return contents.split("\n").flatMap((line) => {
    const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);

    if (!match || !DATABASE_KEYS.has(match[1])) return [];

    return [
      { key: match[1], value: match[2].trim().replace(/^["'`]|["'`]$/g, "") },
    ];
  });
}

export function setupRefusal({
  isMainCheckout,
  source,
  sourceIsLocalEnv,
  sourceContents,
  localEnvIsFile,
}: SetupState): string | undefined {
  if (isMainCheckout)
    return "setup is for worktrees only. This is the main checkout, where .env.local is your real env; run setup in a worktree instead.";

  if (sourceIsLocalEnv)
    return `TWOGETHER_DEV_ENV points at this worktree's own .env.local (${source}), so the link would point at itself. Point it at the dev env instead.`;

  if (sourceContents === undefined)
    return `no dev env at ${source}. Create it with Clerk development keys (\`npx clerk@latest init\`), or point TWOGETHER_DEV_ENV at one.`;

  if (LIVE_CLERK_KEY.test(sourceContents))
    return `${source} holds live Clerk keys (sk_live_/pk_live_). Replace them with development keys (sk_test_/pk_test_), or point TWOGETHER_DEV_ENV at a dev-only env file.`;

  const remote = databaseUrls(sourceContents).find(
    ({ value }) => !LOCAL_DATABASE.test(value),
  );

  if (remote)
    return `${source} sets ${remote.key} to something other than a local SQLite path. Remove that line so the app uses local SQLite, or point TWOGETHER_DEV_ENV at a dev-only env file.`;

  if (localEnvIsFile)
    return `.env.local is a regular file, not a link to the dev env. It may be a copied production env: move it aside (\`mv .env.local .env.local.bak\`) and rerun \`bun run setup\`.`;

  return undefined;
}

function run(command: string[]) {
  const { exitCode } = Bun.spawnSync(command, {
    stdio: ["inherit", "inherit", "inherit"],
  });

  if (exitCode !== 0) {
    console.error(
      `setup: \`${command.join(" ")}\` failed with exit code ${exitCode}.`,
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  const source = resolve(
    process.env.TWOGETHER_DEV_ENV ??
      join(homedir(), "workspaces/twogether/.env.local"),
  );

  process.chdir(join(import.meta.dir, ".."));
  const localEnv = lstatSync(".env.local", { throwIfNoEntry: false });

  const [gitDir, gitCommonDir] = Bun.spawnSync([
    "git",
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  ])
    .stdout.toString()
    .trim()
    .split("\n");

  const sourceLocation = existsSync(dirname(source))
    ? join(realpathSync(dirname(source)), basename(source))
    : source;

  const refusal = setupRefusal({
    isMainCheckout: gitDir === gitCommonDir,
    source,
    sourceIsLocalEnv: sourceLocation === join(realpathSync("."), ".env.local"),
    sourceContents: existsSync(source)
      ? readFileSync(source, "utf8")
      : undefined,
    localEnvIsFile: localEnv !== undefined && !localEnv.isSymbolicLink(),
  });

  if (refusal) {
    console.error(`setup: ${refusal}`);
    process.exit(1);
  }

  run(["bun", "install", "--frozen-lockfile"]);

  if (localEnv) unlinkSync(".env.local");
  symlinkSync(realpathSync(source), ".env.local");
  run(["bunx", "playwright", "install", "chromium"]);
  run(["bun", "scripts/check-env.ts"]);
  console.log(`setup: ready, .env.local -> ${source}`);
}

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { setupRefusal, type SetupState } from "./setup-worktree";

const source = "/home/dev/.env.local";

const devEnv = [
  "VITE_CLERK_PUBLISHABLE_KEY=pk_test_abc",
  "CLERK_SECRET_KEY=sk_test_abc",
  "BUDGET_DATABASE_PATH=./data/twogether.sqlite",
].join("\n");

function refusal(state: Partial<SetupState>) {
  return setupRefusal({
    isMainCheckout: false,
    source,
    sourceIsLocalEnv: false,
    sourceContents: devEnv,
    localEnvIsFile: false,
    ...state,
  });
}

describe("setupRefusal", () => {
  test("accepts a dev env with test keys and a local database", () => {
    expect(refusal({})).toBeUndefined();
    expect(
      refusal({ sourceContents: `${devEnv}\nTURSO_DATABASE_URL=\n` }),
    ).toBeUndefined();
  });

  test("refuses a missing env file and names how to create one", () => {
    const message = refusal({ sourceContents: undefined });

    expect(message).toContain(`no dev env at ${source}`);
    expect(message).toContain("TWOGETHER_DEV_ENV");
  });

  test.each([
    "CLERK_SECRET_KEY=sk_live_abc",
    "VITE_CLERK_PUBLISHABLE_KEY=pk_live_abc",
  ])("refuses live Clerk keys: %s", (line) => {
    expect(refusal({ sourceContents: `${devEnv}\n${line}` })).toContain(
      "Replace them with development keys",
    );
  });

  test.each([
    "TURSO_DATABASE_URL=libsql://twogether-prod.turso.io",
    'TURSO_DATABASE_URL="turso://twogether-prod"',
    "export BUDGET_DATABASE_PATH=https://db.example.com",
    "BUDGET_DATABASE_PATH=http://db.example.com",
    "TURSO_DATABASE_URL='wss://db.example.com'",
    "TURSO_DATABASE_URL=ws://db.example.com",
    "TURSO_DATABASE_URL=$REMOTE_DB",
    "BUDGET_DATABASE_PATH=${REMOTE_DB}",
    "TURSO_DATABASE_URL=`libsql://twogether-prod.turso.io`",
  ])("refuses a remote or unresolved database URL: %s", (line) => {
    expect(refusal({ sourceContents: `${devEnv}\n${line}` })).toMatch(
      /sets \w+ to something other than a local SQLite path\. Remove that line/,
    );
  });

  test.each([
    "BUDGET_DATABASE_PATH=:memory:",
    "BUDGET_DATABASE_PATH=file:./data/dev.sqlite",
    'BUDGET_DATABASE_PATH="/tmp/twogether.sqlite"',
  ])("accepts a local database: %s", (line) => {
    expect(refusal({ sourceContents: `${devEnv}\n${line}` })).toBeUndefined();
  });

  test("ignores database variables the app does not read", () => {
    expect(
      refusal({
        sourceContents: `${devEnv}\nDATABASE_URL=libsql://unused.turso.io`,
      }),
    ).toBeUndefined();
  });

  test("refuses to replace a regular .env.local file and says to move it aside", () => {
    const message = refusal({ localEnvIsFile: true });

    expect(message).toContain("move it aside (`mv .env.local .env.local.bak`)");
    expect(message).not.toContain("delete");
  });

  test("refuses when git cannot tell a worktree from the main checkout", () => {
    expect(refusal({ isMainCheckout: undefined })).toContain(
      "`git rev-parse` failed",
    );
  });

  test("refuses the main checkout before touching its real .env.local", () => {
    expect(refusal({ isMainCheckout: true, localEnvIsFile: true })).toContain(
      "setup is for worktrees only",
    );
  });

  test("refuses a dev env that is this worktree's own .env.local", () => {
    expect(
      refusal({ sourceIsLocalEnv: true, sourceContents: undefined }),
    ).toContain("the link would point at itself");
  });
});

describe("setup-worktree script", () => {
  test("keeps .env.local resolving when the dev env links through it", () => {
    const tmp = realpathSync(mkdtempSync("/tmp/setup-worktree-"));
    const repo = join(tmp, "repo");
    const worktree = join(tmp, "worktree");
    const bin = join(tmp, "bin");
    const devEnv = join(tmp, "dev.env");
    const bun = spawnSync("which", ["bun"]).stdout.toString().trim();

    const git = (...args: string[]) => {
      const { status, stderr } = spawnSync("git", ["-C", repo, ...args], {
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
        },
      });

      if (status !== 0)
        throw new Error(`git ${args.join(" ")}: ${stderr.toString()}`);
    };

    try {
      mkdirSync(join(repo, "scripts"), { recursive: true });
      copyFileSync(
        join(import.meta.dirname, "setup-worktree.ts"),
        join(repo, "scripts/setup-worktree.ts"),
      );
      git("init", "-q");
      git("add", ".");
      git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init");
      git("worktree", "add", "-q", "--detach", worktree);

      mkdirSync(bin);

      for (const stub of ["bun", "bunx"]) {
        writeFileSync(join(bin, stub), "#!/bin/sh\nexit 0\n");
        chmodSync(join(bin, stub), 0o755);
      }

      writeFileSync(devEnv, "CLERK_SECRET_KEY=sk_test_abc\n");
      symlinkSync(devEnv, join(worktree, ".env.local"));
      symlinkSync(join(worktree, ".env.local"), join(worktree, "chain.env"));

      const run = spawnSync(
        bun,
        ["--no-env-file", join(worktree, "scripts/setup-worktree.ts")],
        {
          env: {
            ...process.env,
            HOME: tmp,
            PATH: `${bin}:${process.env.PATH}`,
            TWOGETHER_DEV_ENV: join(worktree, "chain.env"),
          },
        },
      );

      expect(run.stderr.toString()).toBe("");
      expect(run.status).toBe(0);
      expect(realpathSync(join(worktree, ".env.local"))).toBe(devEnv);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

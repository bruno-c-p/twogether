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

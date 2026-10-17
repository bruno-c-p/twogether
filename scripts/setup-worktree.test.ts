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
    source,
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
    "export DATABASE_URL=https://db.example.com",
    "BUDGET_DATABASE_PATH=http://db.example.com",
    "TURSO_DATABASE_URL='wss://db.example.com'",
    "TURSO_DATABASE_URL=ws://db.example.com",
  ])("refuses a remote database URL: %s", (line) => {
    expect(refusal({ sourceContents: `${devEnv}\n${line}` })).toMatch(
      /sets \w+ to a remote database\. Remove that line/,
    );
  });

  test("refuses to replace a regular .env.local file", () => {
    expect(refusal({ localEnvIsFile: true })).toContain(
      "delete it and rerun `bun run setup`",
    );
  });
});

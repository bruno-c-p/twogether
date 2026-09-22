import { describe, expect, test } from "bun:test";
import { parseServerEnv } from "@/server/env.server";

const clerk = { CLERK_SECRET_KEY: "sk_test_placeholder" };

describe("parseServerEnv", () => {
  test("accepts a local database without remote credentials", () => {
    const env = parseServerEnv({
      ...clerk,
      BUDGET_DATABASE_PATH: "./data/twogether.sqlite",
    });
    expect(env.BUDGET_DATABASE_PATH).toBe("./data/twogether.sqlite");
    expect(env.TURSO_AUTH_TOKEN).toBeUndefined();
  });

  test("accepts the in-memory database without remote credentials", () => {
    const env = parseServerEnv({ ...clerk, BUDGET_DATABASE_PATH: ":memory:" });
    expect(env.BUDGET_DATABASE_PATH).toBe(":memory:");
  });

  test("treats empty values as unset", () => {
    const env = parseServerEnv({
      ...clerk,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      BUDGET_DATABASE_PATH: "",
    });
    expect(env.TURSO_DATABASE_URL).toBeUndefined();
    expect(env.TURSO_AUTH_TOKEN).toBeUndefined();
    expect(env.BUDGET_DATABASE_PATH).toBeUndefined();
  });

  test("requires the Clerk secret key", () => {
    expect(() => parseServerEnv({})).toThrow("CLERK_SECRET_KEY");
  });

  test("requires a Turso token when the database is remote", () => {
    expect(() =>
      parseServerEnv({
        ...clerk,
        TURSO_DATABASE_URL: "libsql://example.turso.io",
      }),
    ).toThrow("TURSO_AUTH_TOKEN");
  });

  test("accepts a remote database when its token is present", () => {
    const env = parseServerEnv({
      ...clerk,
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "token",
    });
    expect(env.TURSO_DATABASE_URL).toBe("libsql://example.turso.io");
  });

  test("rejects a malformed remote database url", () => {
    expect(() =>
      parseServerEnv({ ...clerk, TURSO_DATABASE_URL: "https://" }),
    ).toThrow("banco de dados");
  });
});

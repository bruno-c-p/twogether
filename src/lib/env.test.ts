import { describe, expect, it } from "vitest";
import { parseClientEnv } from "@/lib/env";

const clerk = { VITE_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder" };

describe("parseClientEnv", () => {
  it("requires the Clerk publishable key", () => {
    expect(() => parseClientEnv({})).toThrow("VITE_CLERK_PUBLISHABLE_KEY");
  });

  it("treats an empty Clerk publishable key as unset", () => {
    expect(() => parseClientEnv({ VITE_CLERK_PUBLISHABLE_KEY: "" })).toThrow(
      "VITE_CLERK_PUBLISHABLE_KEY",
    );
  });

  it("returns the Clerk publishable key", () => {
    const env = parseClientEnv(clerk);

    expect(env.VITE_CLERK_PUBLISHABLE_KEY).toBe("pk_test_placeholder");
  });
});

import { describe, expect, it } from "vitest";
import { parseClientEnv } from "@/lib/env";

const clerk = { VITE_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder" };

const posthog = {
  VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_placeholder",
  VITE_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
};

describe("parseClientEnv", () => {
  it("requires the Clerk publishable key", () => {
    expect(() => parseClientEnv({})).toThrow("VITE_CLERK_PUBLISHABLE_KEY");
  });

  it("requires the PostHog variables in development", () => {
    expect(() => parseClientEnv(clerk, { dev: true })).toThrow("PostHog");
  });

  it("accepts a missing PostHog configuration outside development", () => {
    const env = parseClientEnv(clerk);
    expect(env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN).toBeUndefined();
    expect(env.VITE_PUBLIC_POSTHOG_HOST).toBeUndefined();
  });

  it("returns the configured values", () => {
    const env = parseClientEnv({ ...clerk, ...posthog }, { dev: true });
    expect(env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN).toBe("phc_placeholder");
    expect(env.VITE_PUBLIC_POSTHOG_HOST).toBe("https://us.i.posthog.com");
  });

  it("treats empty values as unset", () => {
    const env = parseClientEnv({
      ...clerk,
      VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
      VITE_PUBLIC_POSTHOG_HOST: "",
    });

    expect(env.VITE_PUBLIC_POSTHOG_HOST).toBeUndefined();
  });
});

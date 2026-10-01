import { describe, expect, test } from "bun:test";
import {
  consumeRateLimit,
  rememberRetryAfter,
  retryAfterFor,
} from "@/server/rate-limit.server";

describe("consumeRateLimit", () => {
  test("allows requests up to the limit", () => {
    for (let index = 0; index < 5; index++)
      expect(consumeRateLimit("user_allowed", 5, 60_000)).toEqual({ ok: true });
  });

  test("blocks past the limit and reports a retry delay", () => {
    expect(consumeRateLimit("user_blocked", 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit("user_blocked", 2, 60_000).ok).toBe(true);
    const blocked = consumeRateLimit("user_blocked", 2, 60_000);
    expect(blocked.ok).toBe(false);

    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("keeps a separate window per key", () => {
    expect(consumeRateLimit("user_one", 1, 60_000).ok).toBe(true);
    expect(consumeRateLimit("user_one", 1, 60_000).ok).toBe(false);
    expect(consumeRateLimit("user_two", 1, 60_000).ok).toBe(true);
  });

  test("resets once the window elapses", () => {
    expect(consumeRateLimit("user_window", 1, 0).ok).toBe(true);
    expect(consumeRateLimit("user_window", 1, 0).ok).toBe(true);
  });
});

describe("retryAfterFor", () => {
  test("returns the wait remembered for that request only", () => {
    const limited = new Request("http://localhost/_serverFn/a");
    rememberRetryAfter(limited, 42);
    expect(retryAfterFor(limited)).toBe(42);
    expect(retryAfterFor(new Request("http://localhost/_serverFn/b"))).toBe(
      undefined,
    );
  });
});

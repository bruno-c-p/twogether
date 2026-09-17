import { describe, expect, test } from "bun:test";
import { createBudgetStore } from "@/features/budget/services/shared.server";
import { sessionCookieOptions } from "@/features/budget/session-cookie";
import { setupMemoryStore } from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

describe("auth store", () => {
  test("magic links verify ownership once and reuse existing accounts", async () => {
    const { store, deliveries } = ctx;
    const requested = await store.requestLink({ email: "ANA@example.test" });
    expect((await store.snapshot(undefined)).user).toBeNull();
    expect(JSON.stringify(requested)).not.toContain(deliveries[0].token);
    const verified = await store.verifyLink(
      { token: deliveries[0].token },
      undefined,
    );
    expect((await store.snapshot(verified.session)).user?.email).toBe(
      "ana@example.test",
    );
    await expect(
      store.verifyLink({ token: deliveries[0].token }, undefined),
    ).rejects.toThrow("já foi usado");
    await store.requestLink({ email: "ana@example.test" });
    const again = await store.verifyLink(
      { token: deliveries[1].token },
      undefined,
    );
    expect((await store.snapshot(again.session)).user?.id).toBe(
      (await store.snapshot(verified.session)).user?.id,
    );
    await store.logout(again.session);
    expect((await store.snapshot(again.session)).user).toBeNull();
    expect((await store.snapshot("forged")).user).toBeNull();
  });

  test("development login creates and reuses accounts without email", async () => {
    const { store } = ctx;
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const first = await store.devLogin(
        { email: "ANA@example.test" },
        undefined,
      );
      expect((await store.snapshot(first.session)).user).toMatchObject({
        email: "ana@example.test",
        name: "",
      });
      await store.setName((await store.sessionUser(first.session))!, "Ana");
      const existing = await store.devLogin(
        { email: "ana@example.test" },
        undefined,
      );
      const user = (await store.snapshot(existing.session)).user;
      expect(user?.id).toBe((await store.snapshot(first.session)).user?.id);
      expect(user?.name).toBe("Ana");
      process.env.NODE_ENV = "production";
      await expect(
        store.devLogin({ email: "ana@example.test" }, undefined),
      ).rejects.toThrow("indisponível");
    } finally {
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });

  test("magic links expire after 15 minutes and forged tokens fail", async () => {
    const { store, deliveries } = ctx;
    await store.requestLink({ email: "ana@example.test" });
    await expect(
      store.verifyLink({ token: "forged" }, undefined),
    ).rejects.toThrow("expirou");
    const now = Date.now;
    const time = now();
    try {
      Date.now = () => time + 16 * 60_000;
      await expect(
        store.verifyLink({ token: deliveries[0].token }, undefined),
      ).rejects.toThrow("expirou");
    } finally {
      Date.now = now;
    }
  });

  test("verify-link attempts are throttled", async () => {
    const { store } = ctx;
    for (let i = 0; i < 10; i++)
      await expect(
        store.verifyLink({ token: "forged" }, undefined),
      ).rejects.toThrow("expirou");
    await expect(
      store.verifyLink({ token: "forged" }, undefined),
    ).rejects.toThrow("Muitas tentativas");
  });

  test("email request keeps invitation and limits repeated sends", async () => {
    const { store, deliveries } = ctx;
    const invite = "a".repeat(64);
    for (let i = 0; i < 5; i++)
      await store.requestLink({ email: "ana@example.test", invite });
    expect(deliveries[0].invite).toBe(invite);
    await expect(
      store.requestLink({ email: "ana@example.test" }),
    ).rejects.toThrow("Muitas tentativas");
  });

  test("failed email delivery never leaves a usable login token", async () => {
    let token = "";
    const failed = createBudgetStore(":memory:", {
      sendMagicLink: async (message) => {
        token = message.token;
        throw new Error("test delivery unavailable");
      },
    });
    try {
      await expect(
        failed.requestLink({ email: "ana@example.test" }),
      ).rejects.toThrow("enviar o e-mail");
      await expect(failed.verifyLink({ token }, undefined)).rejects.toThrow(
        "expirou",
      );
    } finally {
      failed.close();
    }
  });

  test("sessions expire after 30 days", async () => {
    const { store } = ctx;
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const first = await store.devLogin(
        { email: "ana@example.test" },
        undefined,
      );
      const now = Date.now;
      const time = now();
      try {
        Date.now = () => time + 31 * 86400_000;
        expect((await store.snapshot(first.session)).user).toBeNull();
        expect(await store.sessionUser(first.session)).toBeFalsy();
      } finally {
        Date.now = now;
      }
    } finally {
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });

  test("session cookies are private, HttpOnly, Lax and Secure on HTTPS", () => {
    expect(sessionCookieOptions(true, "token")).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 30 * 86400,
    });
    expect(sessionCookieOptions(false, undefined)).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
      maxAge: 0,
    });
  });
});

test("Resend transport sends HTML and text with the configured origin and never accepts a failed send", async () => {
  const { sendMagicLink } =
    await import("@/features/budget/services/email.server");
  const old = {
    key: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
    origin: process.env.APP_ORIGIN,
  };
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-placeholder";
  process.env.RESEND_FROM = "Twogether <test@example.test>";
  process.env.APP_ORIGIN = "https://budget.test";
  let payload: Record<string, unknown> = {};
  let key = "";
  globalThis.fetch = Object.assign(
    async (_input: string | URL | Request, init?: RequestInit) => {
      payload = JSON.parse(
        typeof init?.body === "string" ? init.body : "{}",
      ) as Record<string, unknown>;
      key = new Headers(init?.headers).get("Idempotency-Key") ?? "";
      return Response.json({ id: "test-message" });
    },
    originalFetch,
  );
  try {
    await sendMagicLink({
      email: "ana@example.test",
      token: "test-token",
      invite: "test-invite",
    });
    expect(payload.to).toEqual(["ana@example.test"]);
    expect(payload.html).toContain(
      "https://budget.test/?access=test-token&amp;convite=test-invite",
    );
    expect(payload.text).toContain(
      "https://budget.test/?access=test-token&convite=test-invite",
    );
    expect(key).not.toContain("test-token");
    globalThis.fetch = Object.assign(
      async () => new Response("rejected", { status: 429 }),
      originalFetch,
    );
    await expect(
      sendMagicLink({ email: "ana@example.test", token: "test-token" }),
    ).rejects.toThrow("HTTP 429");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of [
      ["RESEND_API_KEY", old.key],
      ["RESEND_FROM", old.from],
      ["APP_ORIGIN", old.origin],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});

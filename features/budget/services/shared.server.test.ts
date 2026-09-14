import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBudgetStore, type BudgetStore } from "./shared.server";
import { handleBudgetRequest } from "../actions/api.server";
import { DEFAULT_PERCENTAGES } from "../constants";
import type { Transaction } from "../types";

let store: BudgetStore;
let previousOrigin: string | undefined;
let deliveries: { email: string; token: string; invite?: string }[];
beforeEach(() => {
  previousOrigin = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://budget.test";
  deliveries = [];
  store = createBudgetStore(":memory:", {
    sendMagicLink: async (message) => {
      deliveries.push(message);
    },
  });
});
afterEach(() => {
  store.close();
  if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = previousOrigin;
});
const signup = async (name: string) => {
  await store.command(
    { action: "request-link", email: `${name.toLowerCase()}@example.test` },
    undefined,
  );
  const result = await store.command(
    { action: "verify-link", token: deliveries.at(-1)!.token },
    undefined,
  );
  await store.command({ action: "profile", name }, result.session);
  return { ...result, snapshot: store.snapshot(result.session) };
};
async function couple() {
  const a = await signup("Ana");
  await store.command({ action: "create" }, a.session);
  const invite = await store.command({ action: "invite" }, a.session);
  const b = await signup("Bia");
  await store.command({ action: "join", token: invite.inviteToken }, b.session);
  return { a, b };
}
function transaction(memberId: string): Transaction {
  return {
    id: "transaction-1",
    description: "Mercado",
    amount: 10000,
    kind: "expense",
    date: "2026-09-14",
    goal: "fixed",
    tags: ["casa"],
    memberId,
  };
}

describe("shared budget", () => {
  test("magic links verify ownership once and reuse existing accounts", async () => {
    const requested = await store.command(
      { action: "request-link", email: "ANA@example.test" },
      undefined,
    );
    expect(requested.snapshot.user).toBeNull();
    expect(JSON.stringify(requested)).not.toContain(deliveries[0].token);
    const verified = await store.command(
      { action: "verify-link", token: deliveries[0].token },
      undefined,
    );
    expect(verified.snapshot.user?.email).toBe("ana@example.test");
    await expect(
      store.command(
        { action: "verify-link", token: deliveries[0].token },
        undefined,
      ),
    ).rejects.toThrow("já foi usado");
    await store.command(
      { action: "request-link", email: "ana@example.test" },
      undefined,
    );
    const again = await store.command(
      { action: "verify-link", token: deliveries[1].token },
      undefined,
    );
    expect(again.snapshot.user?.id).toBe(verified.snapshot.user?.id);
    await store.command({ action: "logout" }, again.session);
    expect(store.snapshot(again.session).user).toBeNull();
    expect(store.snapshot("forged").user).toBeNull();
  });
  test("development login creates and reuses accounts without email", async () => {
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const first = await store.command(
        { action: "dev-login", email: "ANA@example.test" },
        undefined,
      );
      expect(first.snapshot.user).toMatchObject({
        email: "ana@example.test",
        name: "",
      });

      await store.command({ action: "profile", name: "Ana" }, first.session);
      const existing = await store.command(
        { action: "dev-login", email: "ana@example.test" },
        undefined,
      );
      expect(existing.snapshot.user?.id).toBe(first.snapshot.user?.id);
      expect(existing.snapshot.user?.name).toBe("Ana");

      process.env.NODE_ENV = "production";
      await expect(
        store.command(
          { action: "dev-login", email: "ana@example.test" },
          undefined,
        ),
      ).rejects.toThrow("indisponível");
    } finally {
      if (previousNodeEnvironment === undefined)
        delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });
  test("magic links expire after 15 minutes and forged tokens fail", async () => {
    await store.command(
      { action: "request-link", email: "ana@example.test" },
      undefined,
    );
    await expect(
      store.command({ action: "verify-link", token: "forged" }, undefined),
    ).rejects.toThrow("expirou");
    const now = Date.now;
    const time = now();
    try {
      Date.now = () => time + 16 * 60_000;
      await expect(
        store.command(
          { action: "verify-link", token: deliveries[0].token },
          undefined,
        ),
      ).rejects.toThrow("expirou");
    } finally {
      Date.now = now;
    }
  });
  test("email request keeps invitation and limits repeated sends", async () => {
    const invite = "a".repeat(64);
    for (let i = 0; i < 5; i++)
      await store.command(
        { action: "request-link", email: "ana@example.test", invite },
        undefined,
      );
    expect(deliveries[0].invite).toBe(invite);
    await expect(
      store.command(
        { action: "request-link", email: "ana@example.test" },
        undefined,
      ),
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
        failed.command(
          { action: "request-link", email: "ana@example.test" },
          undefined,
        ),
      ).rejects.toThrow("enviar o e-mail");
      await expect(
        failed.command({ action: "verify-link", token }, undefined),
      ).rejects.toThrow("expirou");
    } finally {
      failed.close();
    }
  });
  test("invitation is single use and a household admits exactly two", async () => {
    const a = await signup("Ana");
    await store.command({ action: "create" }, a.session);
    const invite = await store.command({ action: "invite" }, a.session);
    const b = await signup("Bia");
    const c = await signup("Cris");
    const results = await Promise.allSettled(
      [b, c].map((person) =>
        store.command(
          { action: "join", token: invite.inviteToken },
          person.session,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(store.snapshot(a.session).household?.members).toHaveLength(2);
    await expect(
      store.command({ action: "invite" }, a.session),
    ).rejects.toThrow("duas pessoas");
    await expect(
      store.command({ action: "join", token: invite.inviteToken }, a.session),
    ).rejects.toThrow("já faz parte");
  });
  test("replacing or revoking invitations invalidates old links", async () => {
    const a = await signup("Ana");
    await store.command({ action: "create" }, a.session);
    const b = await signup("Bia");
    const old = await store.command({ action: "invite" }, a.session);
    const next = await store.command({ action: "invite" }, a.session);
    await expect(
      store.command({ action: "join", token: old.inviteToken }, b.session),
    ).rejects.toThrow("expirado");
    await store.command({ action: "revoke-invite" }, a.session);
    await expect(
      store.command({ action: "join", token: next.inviteToken }, b.session),
    ).rejects.toThrow("expirado");
  });
  test("invites and sessions expire", async () => {
    const a = await signup("Ana");
    await store.command({ action: "create" }, a.session);
    const b = await signup("Bia");
    const invite = await store.command({ action: "invite" }, a.session);
    const now = Date.now;
    const time = now();
    try {
      Date.now = () => time + 49 * 3600_000;
      await expect(
        store.command({ action: "join", token: invite.inviteToken }, b.session),
      ).rejects.toThrow("expirado");
      Date.now = () => time + 31 * 86400_000;
      expect(store.snapshot(a.session).user).toBeNull();
      await expect(
        store.command({ action: "invite" }, a.session),
      ).rejects.toThrow("sessão expirou");
    } finally {
      Date.now = now;
    }
  });
  test("both members edit shared transactions; attribution and authorship are independent", async () => {
    const { a, b } = await couple();
    const t = transaction(b.snapshot.user!.id);
    await store.command(
      {
        action: "save",
        transaction: { ...t, createdBy: "forged", updatedBy: "forged" },
      },
      a.session,
    );
    const received = store.snapshot(b.session).budget.transactions[0];
    expect(received.memberId).toBe(b.snapshot.user!.id);
    expect(received.createdBy).toBe(a.snapshot.user!.id);
    await store.command(
      { action: "save", transaction: { ...received, amount: 15000 } },
      b.session,
    );
    const edited = store.snapshot(a.session).budget.transactions[0];
    expect(edited.amount).toBe(15000);
    expect(edited.updatedBy).toBe(b.snapshot.user!.id);
    expect(edited.createdBy).toBe(a.snapshot.user!.id);
  });
  test("stale edits fail and unrelated concurrent additions survive", async () => {
    const { a, b } = await couple();
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    const old = store.snapshot(a.session).budget.transactions[0];
    await store.command(
      { action: "save", transaction: { ...old, amount: 20000 } },
      b.session,
    );
    await expect(
      store.command(
        { action: "save", transaction: { ...old, amount: 1 } },
        a.session,
      ),
    ).rejects.toThrow("mudou");
    await store.command(
      {
        action: "save",
        transaction: { ...transaction(b.snapshot.user!.id), id: "second" },
      },
      b.session,
    );
    expect(store.snapshot(a.session).budget.transactions).toHaveLength(2);
    expect(
      store.snapshot(a.session).budget.transactions.find((t) => t.id === old.id)
        ?.amount,
    ).toBe(20000);
  });
  test("deletion undo restores only that transaction, never a whole stale budget", async () => {
    const { a, b } = await couple();
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    await store.command(
      { action: "delete", id: "transaction-1", revision: 1 },
      b.session,
    );
    await store.command(
      {
        action: "save",
        transaction: { ...transaction(b.snapshot.user!.id), id: "second" },
      },
      b.session,
    );
    await store.command(
      { action: "undo-delete", id: "transaction-1", revision: 2 },
      a.session,
    );
    expect(store.snapshot(b.session).budget.transactions).toHaveLength(2);
    await expect(
      store.command(
        { action: "undo-delete", id: "transaction-1", revision: 2 },
        a.session,
      ),
    ).rejects.toThrow("mudou");
  });
  test("couples are isolated and foreign member attribution is rejected", async () => {
    const { a } = await couple();
    const c = await signup("Cris");
    await store.command({ action: "create" }, c.session);
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    expect(store.snapshot(c.session).budget.transactions).toHaveLength(0);
    await expect(
      store.command(
        { action: "save", transaction: transaction(c.snapshot.user!.id) },
        a.session,
      ),
    ).rejects.toThrow("deste casal");
    await expect(
      store.command(
        { action: "delete", id: "transaction-1", revision: 1 },
        c.session,
      ),
    ).rejects.toThrow("mudou");
    await expect(
      store.command(
        { action: "save", transaction: transaction(a.snapshot.user!.id) },
        undefined,
      ),
    ).rejects.toThrow("sessão expirou");
  });
  test("shared percentages validate totals and reject concurrent overwrite", async () => {
    const { a, b } = await couple();
    const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
    await store.command(
      { action: "percentages", percentages, revision: 0 },
      a.session,
    );
    expect(store.snapshot(b.session).budget.percentages).toEqual(percentages);
    await expect(
      store.command(
        {
          action: "percentages",
          percentages: DEFAULT_PERCENTAGES,
          revision: 0,
        },
        b.session,
      ),
    ).rejects.toThrow("mudou");
    await expect(
      store.command(
        {
          action: "percentages",
          percentages: { ...percentages, fixed: 90 },
          revision: 1,
        },
        b.session,
      ),
    ).rejects.toThrow("100%");
  });
  test("data and sessions survive reopening the database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-test-"));
    const file = join(dir, "test.sqlite");
    let disk = createBudgetStore(file, {
      sendMagicLink: async (message) => {
        deliveries.push(message);
      },
    });
    try {
      await disk.command(
        { action: "request-link", email: "disk@example.test" },
        undefined,
      );
      const a = await disk.command(
        { action: "verify-link", token: deliveries.at(-1)!.token },
        undefined,
      );
      await disk.command({ action: "profile", name: "Ana" }, a.session);
      await disk.command({ action: "create" }, a.session);
      await disk.command(
        { action: "save", transaction: transaction(a.snapshot.user!.id) },
        a.session,
      );
      disk.close();
      disk = createBudgetStore(file);
      expect(disk.snapshot(a.session).budget.transactions).toHaveLength(1);
    } finally {
      disk.close();
      rmSync(dir, { recursive: true });
    }
  });
  test("HTTP rejects cross-origin writes, sets private session cookies and never exposes credentials", async () => {
    const request = (origin: string) =>
      new Request("https://budget.test/api/budget", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request-link",
          email: "ana@example.test",
        }),
      });
    expect(
      (await handleBudgetRequest(request("https://evil.test"), store)).status,
    ).toBe(403);
    await handleBudgetRequest(request("https://budget.test"), store);
    const good = await handleBudgetRequest(
      new Request("https://budget.test/api/budget", {
        method: "POST",
        headers: {
          Origin: "https://budget.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify-link",
          token: deliveries.at(-1)!.token,
        }),
      }),
      store,
    );
    expect(good.status).toBe(200);
    expect(good.headers.get("set-cookie")).toContain(
      "HttpOnly; SameSite=Strict",
    );
    expect(good.headers.get("set-cookie")).toContain("Secure");
    expect(good.headers.get("cache-control")).toBe("no-store");
    const body = await good.text();
    expect(body).not.toContain("password");
    expect(body).not.toContain("session");
  });
});

test("Resend transport sends HTML and text with the configured origin and never accepts a failed send", async () => {
  const { sendMagicLink } = await import("./email.server");
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
      payload = JSON.parse(String(init?.body));
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
      "https://budget.test/#access=test-token&amp;convite=test-invite",
    );
    expect(payload.text).toContain(
      "https://budget.test/#access=test-token&convite=test-invite",
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

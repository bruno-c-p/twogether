import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBudgetStore, type BudgetStore } from "@/features/budget/services/shared.server";
import { sessionCookieOptions } from "@/features/budget/session-cookie";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { BankAccount, Transaction } from "@/features/budget/types";

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
  return { ...result, snapshot: await store.snapshot(result.session) };
};
async function withSnapshot(
  result: Awaited<ReturnType<BudgetStore["command"]>>,
) {
  return { ...result, snapshot: await store.snapshot(result.session) };
}
async function couple() {
  const a = await signup("Ana");
  await store.command({ action: "create" }, a.session);
  const invite = await store.command({ action: "invite" }, a.session);
  const b = await signup("Bia");
  await store.command({ action: "join", token: invite.inviteToken }, b.session);
  return { a, b };
}
function account(id = "account-1"): BankAccount {
  return { id, name: "Nubank", openingBalance: 0 };
}
function transaction(memberId: string, accountId = "account-1"): Transaction {
  return {
    id: "transaction-1",
    description: "Mercado",
    amount: 10000,
    kind: "expense",
    date: "2026-09-14",
    goal: "fixed",
    tags: ["casa"],
    memberId,
    accountId,
  };
}
async function householdReady() {
  const pair = await couple();
  await store.command(
    { action: "save-account", account: account() },
    pair.a.session,
  );
  return pair;
}

describe("shared budget", () => {
  test("magic links verify ownership once and reuse existing accounts", async () => {
    const requested = await withSnapshot(
      await store.command(
        { action: "request-link", email: "ANA@example.test" },
        undefined,
      ),
    );
    expect(requested.snapshot.user).toBeNull();
    expect(JSON.stringify(requested)).not.toContain(deliveries[0].token);
    const verified = await withSnapshot(
      await store.command(
        { action: "verify-link", token: deliveries[0].token },
        undefined,
      ),
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
    const again = await withSnapshot(
      await store.command(
        { action: "verify-link", token: deliveries[1].token },
        undefined,
      ),
    );
    expect(again.snapshot.user?.id).toBe(verified.snapshot.user?.id);
    await store.command({ action: "logout" }, again.session);
    expect((await store.snapshot(again.session)).user).toBeNull();
    expect((await store.snapshot("forged")).user).toBeNull();
  });
  test("development login creates and reuses accounts without email", async () => {
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const first = await withSnapshot(
        await store.command(
          { action: "dev-login", email: "ANA@example.test" },
          undefined,
        ),
      );
      expect(first.snapshot.user).toMatchObject({
        email: "ana@example.test",
        name: "",
      });

      await store.command({ action: "profile", name: "Ana" }, first.session);
      const existing = await withSnapshot(
        await store.command(
          { action: "dev-login", email: "ana@example.test" },
          undefined,
        ),
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
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
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
  test("verify-link attempts are throttled", async () => {
    for (let i = 0; i < 10; i++)
      await expect(
        store.command({ action: "verify-link", token: "forged" }, undefined),
      ).rejects.toThrow("expirou");
    await expect(
      store.command({ action: "verify-link", token: "forged" }, undefined),
    ).rejects.toThrow("Muitas tentativas");
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
    expect((await store.snapshot(a.session)).household?.members).toHaveLength(
      2,
    );
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
      expect((await store.snapshot(a.session)).user).toBeNull();
      await expect(
        store.command({ action: "invite" }, a.session),
      ).rejects.toThrow("sessão expirou");
    } finally {
      Date.now = now;
    }
  });
  test("new transactions use the logged-in member and edits preserve attribution", async () => {
    const { a, b } = await householdReady();
    const t = transaction(b.snapshot.user!.id);
    await store.command(
      {
        action: "save",
        transaction: { ...t, createdBy: "forged", updatedBy: "forged" },
      },
      a.session,
    );
    const received = (await store.snapshot(b.session)).budget.transactions[0];
    expect(received.memberId).toBe(a.snapshot.user!.id);
    expect(received.createdBy).toBe(a.snapshot.user!.id);
    await store.command(
      { action: "save", transaction: { ...received, amount: 15000 } },
      b.session,
    );
    const edited = (await store.snapshot(a.session)).budget.transactions[0];
    expect(edited.memberId).toBe(a.snapshot.user!.id);
    expect(edited.amount).toBe(15000);
    expect(edited.updatedBy).toBe(b.snapshot.user!.id);
    expect(edited.createdBy).toBe(a.snapshot.user!.id);
  });
  test("stale edits fail and unrelated concurrent additions survive", async () => {
    const { a, b } = await householdReady();
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    const old = (await store.snapshot(a.session)).budget.transactions[0];
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
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      2,
    );
    expect(
      (await store.snapshot(a.session)).budget.transactions.find(
        (t) => t.id === old.id,
      )?.amount,
    ).toBe(20000);
  });
  test("retrying a create whose response was lost succeeds instead of conflicting", async () => {
    const { a } = await householdReady();
    const t = transaction(a.snapshot.user!.id);
    await store.command({ action: "save", transaction: t }, a.session);
    const retry = await withSnapshot(
      await store.command({ action: "save", transaction: t }, a.session),
    );
    expect(retry.snapshot.budget.transactions).toHaveLength(1);
    await expect(
      store.command(
        { action: "save", transaction: { ...t, amount: 999 } },
        a.session,
      ),
    ).rejects.toThrow("mudou");
  });
  test("deletion undo restores only that transaction, never a whole stale budget", async () => {
    const { a, b } = await householdReady();
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
    expect((await store.snapshot(b.session)).budget.transactions).toHaveLength(
      2,
    );
    await expect(
      store.command(
        { action: "undo-delete", id: "transaction-1", revision: 2 },
        a.session,
      ),
    ).rejects.toThrow("mudou");
  });
  test("couples are isolated and transaction attribution comes from the session", async () => {
    const { a } = await householdReady();
    const c = await signup("Cris");
    await store.command({ action: "create" }, c.session);
    await store.command(
      { action: "save", transaction: transaction(c.snapshot.user!.id) },
      a.session,
    );
    expect(
      (await store.snapshot(a.session)).budget.transactions[0]?.memberId,
    ).toBe(a.snapshot.user!.id);
    expect((await store.snapshot(c.session)).budget.transactions).toHaveLength(
      0,
    );
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
  test("individual percentages validate totals and reject same-person concurrent overwrite", async () => {
    const { a, b } = await couple();
    const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
    await store.command(
      { action: "percentages", percentages, revision: 0 },
      a.session,
    );
    expect((await store.snapshot(a.session)).budget.percentages).toEqual(
      percentages,
    );
    expect((await store.snapshot(b.session)).budget.percentages).toEqual(
      DEFAULT_PERCENTAGES,
    );
    await store.command(
      {
        action: "percentages",
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
        memberId: a.snapshot.user!.id,
      },
      b.session,
    );
    expect((await store.snapshot(a.session)).budget.percentages).toEqual(
      percentages,
    );
    expect(
      (await store.snapshot(b.session)).household?.members.find(
        (member) => member.id === a.snapshot.user!.id,
      )?.percentages,
    ).toEqual(percentages);
    await expect(
      store.command(
        {
          action: "percentages",
          percentages: DEFAULT_PERCENTAGES,
          revision: 0,
        },
        a.session,
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
      const userId = (await disk.snapshot(a.session)).user!.id;
      await disk.command({ action: "profile", name: "Ana" }, a.session);
      await disk.command({ action: "create" }, a.session);
      await disk.command(
        { action: "save-account", account: account() },
        a.session,
      );
      await disk.command(
        { action: "save", transaction: transaction(userId) },
        a.session,
      );
      disk.close();
      disk = createBudgetStore(file);
      expect((await disk.snapshot(a.session)).budget.transactions).toHaveLength(
        1,
      );
    } finally {
      disk.close();
      rmSync(dir, { recursive: true });
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
  const { sendMagicLink } = await import("@/features/budget/services/email.server");
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

test("legacy household percentages migrate to both people once without changing transactions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "twogether-migration-"));
  const file = join(dir, "test.sqlite");
  const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
  const legacy = new Database(file);
  legacy.exec(`CREATE TABLE households (id TEXT PRIMARY KEY, percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, household_id TEXT REFERENCES households(id));
    CREATE TABLE transactions (id TEXT NOT NULL, household_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id,id));`);
  legacy
    .query("INSERT INTO households VALUES ('home', ?, 4)")
    .run(JSON.stringify(percentages));
  legacy.exec(
    "INSERT INTO users VALUES ('a','Ana','a@test.com','home'), ('b','Bia','b@test.com','home')",
  );
  const payload = JSON.stringify(transaction("a"));
  legacy
    .query("INSERT INTO transactions VALUES ('transaction-1','home',?,2,0)")
    .run(payload);
  legacy.close();
  try {
    const migrated = createBudgetStore(file);
    await migrated.snapshot(undefined);
    migrated.close();
    const inspect = new Database(file);
    expect(
      inspect
        .query(
          "SELECT percentages, revision FROM member_percentages ORDER BY user_id",
        )
        .all(),
    ).toEqual([
      { percentages: JSON.stringify(percentages), revision: 0 },
      { percentages: JSON.stringify(percentages), revision: 0 },
    ]);
    expect(
      inspect.query("SELECT payload, revision FROM transactions").get(),
    ).toEqual({ payload, revision: 2 });
    inspect
      .query(
        "UPDATE member_percentages SET percentages = ?, revision = 1 WHERE user_id = 'a'",
      )
      .run(JSON.stringify(DEFAULT_PERCENTAGES));
    inspect.close();
    const reopened = createBudgetStore(file);
    await reopened.snapshot(undefined);
    reopened.close();
    const verify = new Database(file);
    expect(
      verify
        .query(
          "SELECT percentages, revision FROM member_percentages WHERE user_id = 'a'",
        )
        .get(),
    ).toEqual({
      percentages: JSON.stringify(DEFAULT_PERCENTAGES),
      revision: 1,
    });
    verify.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("monthly recurring transactions", () => {
  test("clamps month ends, persists for both members and edits only one occurrence", async () => {
    const { a, b } = await householdReady();
    const original = {
      ...transaction(a.snapshot.user!.id),
      date: "2028-01-31",
    };
    const result = await withSnapshot(
      await store.command(
        { action: "save", transaction: original, occurrences: 3 },
        a.session,
      ),
    );
    const rows = result.snapshot.budget.transactions.sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    expect(rows.map((row) => row.date)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect((await store.snapshot(b.session)).budget.transactions).toHaveLength(
      3,
    );
    await store.command(
      { action: "save", transaction: { ...rows[1], amount: 20000 } },
      b.session,
    );
    expect(
      (await store.snapshot(a.session)).budget.transactions.filter(
        (row) => row.amount === 20000,
      ),
    ).toHaveLength(1);
    const retried = await withSnapshot(
      await store.command(
        { action: "save", transaction: original, occurrences: 3 },
        a.session,
      ),
    );
    expect(retried.snapshot.budget.transactions).toHaveLength(3);
    await expect(
      store.command(
        { action: "save", transaction: rows[0], occurrences: 3 },
        a.session,
      ),
    ).rejects.toThrow("individualmente");
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      3,
    );
  });
  test("rejects invalid counts and rolls back dates beyond supported range", async () => {
    const { a } = await householdReady();
    const original = transaction(a.snapshot.user!.id);
    for (const occurrences of [0, -1, 1.5, 121, "12"]) {
      await expect(
        store.command(
          { action: "save", transaction: original, occurrences },
          a.session,
        ),
      ).rejects.toThrow();
    }
    await expect(
      store.command(
        {
          action: "save",
          transaction: { ...original, date: "9999-12-31" },
          occurrences: 2,
        },
        a.session,
      ),
    ).rejects.toThrow();
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      0,
    );
  });
});

test("deletes only the selected series from its original occurrence onward and rejects stale batches", async () => {
  const { a, b } = await householdReady();
  const original = transaction(a.snapshot.user!.id);
  await store.command(
    { action: "save", transaction: original, occurrences: 4 },
    a.session,
  );
  await store.command(
    {
      action: "save",
      transaction: { ...original, id: "other" },
      occurrences: 4,
    },
    a.session,
  );
  const snapshot = await store.snapshot(a.session);
  const series = snapshot.budget.transactions
    .filter(
      (item) =>
        item.recurrenceId ===
        snapshot.budget.transactions.find((item) => item.id === original.id)!
          .recurrenceId,
    )
    .sort((a, b) => a.recurrenceIndex! - b.recurrenceIndex!);
  await store.command(
    { action: "save", transaction: { ...series[2], date: "2020-01-01" } },
    b.session,
  );
  const remove = (following: Transaction[]) =>
    store.command(
      {
        action: "delete",
        id: series[1].id,
        revision: series[1].revision,
        following: following.map((item) => ({
          id: item.id,
          revision: item.revision,
        })),
      },
      a.session,
    );
  await expect(remove(series.slice(2))).rejects.toThrow();
  expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(8);
  const current = (await store.snapshot(a.session)).budget.transactions;
  await remove(
    current.filter(
      (item) =>
        item.recurrenceId === series[0].recurrenceId &&
        item.recurrenceIndex! > 1,
    ),
  );
  const remaining = (await store.snapshot(b.session)).budget.transactions;
  expect(remaining).toHaveLength(5);
  expect(
    remaining
      .filter((item) => item.recurrenceId === series[0].recurrenceId)
      .map((item) => item.id),
  ).toEqual([series[0].id]);
});

describe("bank accounts", () => {
  test("creates, edits and shares accounts with both members", async () => {
    const { a, b } = await couple();
    const created = await withSnapshot(
      await store.command(
        { action: "save-account", account: account() },
        a.session,
      ),
    );
    expect(created.snapshot.budget.accounts).toEqual([
      { id: "account-1", name: "Nubank", openingBalance: 0, revision: 1 },
    ]);
    expect((await store.snapshot(b.session)).budget.accounts).toHaveLength(1);
    const current = created.snapshot.budget.accounts[0];
    await store.command(
      { action: "save-account", account: { ...current, name: "Itaú" } },
      b.session,
    );
    expect((await store.snapshot(a.session)).budget.accounts[0]?.name).toBe(
      "Itaú",
    );
  });
  test("stores an opening balance on the account", async () => {
    const { a } = await couple();
    const created = await withSnapshot(
      await store.command(
        {
          action: "save-account",
          account: { ...account(), openingBalance: 250000 },
        },
        a.session,
      ),
    );
    expect(created.snapshot.budget.accounts[0]?.openingBalance).toBe(250000);
    await expect(
      store.command(
        {
          action: "save-account",
          account: { ...account("bad"), openingBalance: -1 },
        },
        a.session,
      ),
    ).rejects.toThrow("conta");
  });
  test("requires an existing account on every transaction save", async () => {
    const { a } = await couple();
    await expect(
      store.command(
        { action: "save", transaction: transaction(a.snapshot.user!.id) },
        a.session,
      ),
    ).rejects.toThrow("conta bancária");
    await store.command(
      { action: "save-account", account: account() },
      a.session,
    );
    await expect(
      store.command(
        {
          action: "save",
          transaction: transaction(a.snapshot.user!.id, "missing"),
        },
        a.session,
      ),
    ).rejects.toThrow("conta bancária");
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    expect((await store.snapshot(a.session)).budget.transactions[0]?.accountId).toBe(
      "account-1",
    );
  });
  test("rejects deleting an account still used by a transaction", async () => {
    const { a } = await householdReady();
    await store.command(
      { action: "save", transaction: transaction(a.snapshot.user!.id) },
      a.session,
    );
    await expect(
      store.command(
        { action: "delete-account", id: "account-1", revision: 1 },
        a.session,
      ),
    ).rejects.toThrow("transações desta conta");
    expect((await store.snapshot(a.session)).budget.accounts).toHaveLength(1);
    await store.command(
      { action: "delete", id: "transaction-1", revision: 1 },
      a.session,
    );
    await store.command(
      { action: "delete-account", id: "account-1", revision: 1 },
      a.session,
    );
    expect((await store.snapshot(a.session)).budget.accounts).toHaveLength(0);
  });
  test("stale account edits fail and households stay isolated", async () => {
    const { a, b } = await householdReady();
    const old = (await store.snapshot(a.session)).budget.accounts[0];
    await store.command(
      { action: "save-account", account: { ...old, name: "Caixa" } },
      b.session,
    );
    await expect(
      store.command(
        { action: "save-account", account: { ...old, name: "Bradesco" } },
        a.session,
      ),
    ).rejects.toThrow("mudou");
    const c = await signup("Cris");
    await store.command({ action: "create" }, c.session);
    await expect(
      store.command(
        { action: "delete-account", id: "account-1", revision: 2 },
        c.session,
      ),
    ).rejects.toThrow("mudou");
    expect((await store.snapshot(c.session)).budget.accounts).toHaveLength(0);
  });
});

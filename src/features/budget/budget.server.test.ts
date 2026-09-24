import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { createBudgetStore } from "@/features/budget/budget.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { Transaction } from "@/features/budget/domain/types";
import {
  account,
  couple,
  householdReady,
  requireUser,
  signup,
  transaction,
  setupMemoryStore,
  withHousehold,
} from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

describe("budget store", () => {
  test("new transactions use the logged-in member and edits preserve attribution", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const t = transaction(b.snapshot.user!.id);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: { ...t, createdBy: "forged", updatedBy: "forged" },
    });
    const received = (await store.snapshot(b.user)).budget.transactions[0];
    expect(received.memberId).toBe(a.snapshot.user!.id);
    expect(received.createdBy).toBe(a.snapshot.user!.id);
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...received, amount: 15000 },
    });
    const edited = (await store.snapshot(a.user)).budget.transactions[0];
    expect(edited.memberId).toBe(a.snapshot.user!.id);
    expect(edited.amount).toBe(15000);
    expect(edited.updatedBy).toBe(b.snapshot.user!.id);
    expect(edited.createdBy).toBe(a.snapshot.user!.id);
  });

  test("stale edits fail and unrelated concurrent additions survive", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(a.snapshot.user!.id),
    });
    const old = (await store.snapshot(a.user)).budget.transactions[0];
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...old, amount: 20000 },
    });
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: { ...old, amount: 1 },
      }),
    ).rejects.toThrow("mudou");
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...transaction(b.snapshot.user!.id), id: "second" },
    });
    expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(
      2,
    );
    expect(
      (await store.snapshot(a.user)).budget.transactions.find(
        (row) => row.id === old.id,
      )?.amount,
    ).toBe(20000);
  });

  test("retrying a create whose response was lost succeeds instead of conflicting", async () => {
    const { store } = ctx;
    const { a } = await householdReady(store);
    const t = transaction(a.snapshot.user!.id);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, { transaction: t });
    await store.saveTransaction(ana.user, ana.household, { transaction: t });
    expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(
      1,
    );
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: { ...t, amount: 999 },
      }),
    ).rejects.toThrow("mudou");
  });

  test("deletion undo restores only that transaction, never a whole stale budget", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const ana = await withHousehold(store, a.user);
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(a.snapshot.user!.id),
    });
    await store.deleteTransaction(bia.user, bia.household, {
      id: "transaction-1",
      revision: 1,
    });
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...transaction(b.snapshot.user!.id), id: "second" },
    });
    await store.restoreTransaction(ana.user, ana.household, {
      id: "transaction-1",
      revision: 2,
    });
    const restored = (await store.snapshot(b.user)).budget.transactions;
    expect(restored).toHaveLength(2);
    expect(restored.find((row) => row.id === "transaction-1")?.amount).toBe(
      10000,
    );
    expect(restored.find((row) => row.id === "second")?.amount).toBe(10000);
    await expect(
      store.restoreTransaction(ana.user, ana.household, {
        id: "transaction-1",
        revision: 2,
      }),
    ).rejects.toThrow("mudou");
  });

  test("couples are isolated and transaction attribution comes from the member", async () => {
    const { store } = ctx;
    const { a } = await householdReady(store);
    const c = await signup(store, "Cris");
    await store.createHousehold(await requireUser(store, c.user));
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(c.snapshot.user!.id),
    });
    expect(
      (await store.snapshot(a.user)).budget.transactions[0]?.memberId,
    ).toBe(a.snapshot.user!.id);
    expect((await store.snapshot(c.user)).budget.transactions).toHaveLength(
      0,
    );
    const cris = await withHousehold(store, c.user);
    await expect(
      store.deleteTransaction(cris.user, cris.household, {
        id: "transaction-1",
        revision: 1,
      }),
    ).rejects.toThrow("mudou");
    expect(await store.snapshot(null)).toMatchObject({
      user: null,
      household: null,
    });
  });

  test("individual percentages validate totals and reject same-person concurrent overwrite", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
    const ana = await withHousehold(store, a.user);
    const bia = await withHousehold(store, b.user);
    await store.savePercentages(ana.user, ana.household, {
      percentages,
      revision: 0,
    });
    expect((await store.snapshot(a.user)).budget.percentages).toEqual(
      percentages,
    );
    expect((await store.snapshot(b.user)).budget.percentages).toEqual(
      DEFAULT_PERCENTAGES,
    );
    await store.savePercentages(bia.user, bia.household, {
      percentages: DEFAULT_PERCENTAGES,
      revision: 0,
    });
    expect((await store.snapshot(a.user)).budget.percentages).toEqual(
      percentages,
    );
    expect(
      (await store.snapshot(b.user)).household?.members.find(
        (member) => member.id === a.snapshot.user!.id,
      )?.percentages,
    ).toEqual(percentages);
    await expect(
      store.savePercentages(ana.user, ana.household, {
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).rejects.toThrow("mudou");
    await expect(
      store.savePercentages(bia.user, bia.household, {
        percentages: { ...percentages, fixed: 90 },
        revision: 1,
      }),
    ).rejects.toThrow("100%");
  });

  test("data survives reopening the database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-test-"));
    const file = join(dir, "test.sqlite");
    let disk = createBudgetStore(file);
    try {
      const user = await disk.ensureUser("user_disk");
      await disk.setName(user, "Ana");
      await disk.createHousehold(await disk.ensureUser("user_disk"));
      const actor = {
        user: await disk.ensureUser("user_disk"),
        household: (await disk.householdFor(
          await disk.ensureUser("user_disk"),
        ))!,
      };
      await disk.saveAccount(actor.user, actor.household, account());
      await disk.saveTransaction(actor.user, actor.household, {
        transaction: transaction(user.id),
      });
      disk.close();
      disk = createBudgetStore(file);
      const reopened = (await disk.snapshot(await disk.ensureUser("user_disk")))
        .budget.transactions;
      expect(reopened).toHaveLength(1);
      expect(reopened[0]?.id).toBe("transaction-1");
      expect(reopened[0]?.amount).toBe(10000);
      expect(reopened[0]?.description).toBe("Mercado");
    } finally {
      disk.close();
      rmSync(dir, { recursive: true });
    }
  });
});

describe("monthly recurring transactions", () => {
  test("clamps month ends, persists for both members and edits only one occurrence", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const original = {
      ...transaction(a.snapshot.user!.id),
      date: "2028-01-31",
    };
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: original,
      occurrences: 3,
    });
    const rows = (await store.snapshot(a.user)).budget.transactions.sort(
      (left, right) => left.date.localeCompare(right.date),
    );
    expect(rows.map((row) => row.date)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect((await store.snapshot(b.user)).budget.transactions).toHaveLength(
      3,
    );
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...rows[1], amount: 20000 },
    });
    expect(
      (await store.snapshot(a.user)).budget.transactions.filter(
        (row) => row.amount === 20000,
      ),
    ).toHaveLength(1);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: original,
      occurrences: 3,
    });
    expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(
      3,
    );
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: rows[0],
        occurrences: 3,
      }),
    ).rejects.toThrow("individualmente");
    expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(
      3,
    );
  });

  test("rejects invalid counts and rolls back dates beyond supported range", async () => {
    const { store } = ctx;
    const { a } = await householdReady(store);
    const original = transaction(a.snapshot.user!.id);
    const ana = await withHousehold(store, a.user);
    for (const occurrences of [0, -1, 1.5, 121]) {
      await expect(
        store.saveTransaction(ana.user, ana.household, {
          transaction: original,
          occurrences,
        }),
      ).rejects.toThrow();
    }
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: { ...original, date: "9999-12-31" },
        occurrences: 2,
      }),
    ).rejects.toThrow();
    expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(
      0,
    );
  });
});

test("deletes only the selected series from its original occurrence onward and rejects stale batches", async () => {
  const { store } = ctx;
  const { a, b } = await householdReady(store);
  const original = transaction(a.snapshot.user!.id);
  const ana = await withHousehold(store, a.user);
  const bia = await withHousehold(store, b.user);
  await store.saveTransaction(ana.user, ana.household, {
    transaction: original,
    occurrences: 4,
  });
  await store.saveTransaction(ana.user, ana.household, {
    transaction: { ...original, id: "other" },
    occurrences: 4,
  });
  const snapshot = await store.snapshot(a.user);
  const series = snapshot.budget.transactions
    .filter(
      (item) =>
        item.recurrenceId ===
        snapshot.budget.transactions.find((item) => item.id === original.id)!
          .recurrenceId,
    )
    .sort((left, right) => left.recurrenceIndex! - right.recurrenceIndex!);
  await store.saveTransaction(bia.user, bia.household, {
    transaction: { ...series[2], date: "2020-01-01" },
  });
  const remove = (following: Transaction[]) =>
    store.deleteTransaction(ana.user, ana.household, {
      id: series[1].id,
      revision: series[1].revision ?? 0,
      following: following.map((item) => ({
        id: item.id,
        revision: item.revision ?? 0,
      })),
    });
  await expect(remove(series.slice(2))).rejects.toThrow();
  expect((await store.snapshot(a.user)).budget.transactions).toHaveLength(8);
  const current = (await store.snapshot(a.user)).budget.transactions;
  await remove(
    current.filter(
      (item) =>
        item.recurrenceId === series[0].recurrenceId &&
        item.recurrenceIndex! > 1,
    ),
  );
  const remaining = (await store.snapshot(b.user)).budget.transactions;
  expect(remaining).toHaveLength(5);
  expect(
    remaining
      .filter((item) => item.recurrenceId === series[0].recurrenceId)
      .map((item) => item.id),
  ).toEqual([series[0].id]);
});

describe("bank accounts", () => {
  test("creates, edits and shares accounts with both members", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await withHousehold(store, a.user);
    await store.saveAccount(ana.user, ana.household, account());
    expect((await store.snapshot(a.user)).budget.accounts).toEqual([
      { id: "account-1", name: "Nubank", openingBalance: 0, revision: 1 },
    ]);
    expect((await store.snapshot(b.user)).budget.accounts).toHaveLength(1);
    const current = (await store.snapshot(a.user)).budget.accounts[0];
    const bia = await withHousehold(store, b.user);
    await store.saveAccount(bia.user, bia.household, {
      ...current,
      name: "Itaú",
    });
    expect((await store.snapshot(a.user)).budget.accounts[0]?.name).toBe(
      "Itaú",
    );
  });

  test("stores an opening balance on the account", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const ana = await withHousehold(store, a.user);
    await store.saveAccount(ana.user, ana.household, {
      ...account("balance"),
      openingBalance: 250000,
    });
    expect(
      (await store.snapshot(a.user)).budget.accounts.find(
        (item) => item.id === "balance",
      )?.openingBalance,
    ).toBe(250000);
    await expect(
      store.saveAccount(ana.user, ana.household, {
        ...account("bad"),
        openingBalance: -1,
      }),
    ).rejects.toThrow("saldo inicial válido");
  });

  test("requires an existing account on every transaction save", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const ana = await withHousehold(store, a.user);
    const userId = (await store.snapshot(a.user)).user!.id;
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: transaction(userId),
      }),
    ).rejects.toThrow("conta bancária");
    await store.saveAccount(ana.user, ana.household, account());
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: transaction(userId, "missing"),
      }),
    ).rejects.toThrow("conta bancária");
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(userId),
    });
    expect(
      (await store.snapshot(a.user)).budget.transactions[0]?.accountId,
    ).toBe("account-1");
  });

  test("rejects deleting an account still used by a transaction", async () => {
    const { store } = ctx;
    const { a } = await householdReady(store);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(a.snapshot.user!.id),
    });
    await expect(
      store.deleteAccount(ana.user, ana.household, {
        id: "account-1",
        revision: 1,
      }),
    ).rejects.toThrow("transações desta conta");
    expect((await store.snapshot(a.user)).budget.accounts).toHaveLength(1);
    await store.deleteTransaction(ana.user, ana.household, {
      id: "transaction-1",
      revision: 1,
    });
    await store.deleteAccount(ana.user, ana.household, {
      id: "account-1",
      revision: 1,
    });
    expect((await store.snapshot(a.user)).budget.accounts).toHaveLength(0);
  });

  test("stale account edits fail and households stay isolated", async () => {
    const { store } = ctx;
    const { a, b } = await householdReady(store);
    const old = (await store.snapshot(a.user)).budget.accounts[0];
    const bia = await withHousehold(store, b.user);
    await store.saveAccount(bia.user, bia.household, {
      ...old,
      name: "Caixa",
    });
    const ana = await withHousehold(store, a.user);
    await expect(
      store.saveAccount(ana.user, ana.household, {
        ...old,
        name: "Bradesco",
      }),
    ).rejects.toThrow("mudou");
    const c = await signup(store, "Cris");
    await store.createHousehold(await requireUser(store, c.user));
    const cris = await withHousehold(store, c.user);
    await expect(
      store.deleteAccount(cris.user, cris.household, {
        id: "account-1",
        revision: 2,
      }),
    ).rejects.toThrow("mudou");
    expect((await store.snapshot(c.user)).budget.accounts).toHaveLength(0);
  });
});

describe("legacy database", () => {
  test("resets the magic-link schema and serves the workspace", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-legacy-"));
    const path = join(dir, "legacy.sqlite");
    const legacy = createClient({ url: `file:${path}`, intMode: "number" });
    try {
      await legacy.batch(
        [
          `CREATE TABLE households (id TEXT PRIMARY KEY, percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`,
          `CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, household_id TEXT REFERENCES households(id))`,
          `CREATE TABLE sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL)`,
          `CREATE TABLE member_percentages (user_id TEXT PRIMARY KEY REFERENCES users(id), percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`,
        ],
        "write",
      );
      await legacy.batch(
        [
          {
            sql: `INSERT INTO households(id, percentages, revision) VALUES (?,?,0)`,
            args: ["legacy-household", JSON.stringify(DEFAULT_PERCENTAGES)],
          },
          {
            sql: `INSERT INTO users(id, name, email, household_id) VALUES (?,?,?,?)`,
            args: ["legacy-user", "Ana", "ana@example.com", "legacy-household"],
          },
        ],
        "write",
      );
    } finally {
      legacy.close();
    }

    const store = createBudgetStore(path);
    try {
      const user = await store.ensureUser("user_clerk_new");
      await store.setName(user, "Bia");
      await store.createHousehold(await store.ensureUser(user.id));
      const snapshot = await store.snapshot(await store.ensureUser(user.id));
      expect(snapshot.user?.name).toBe("Bia");
      expect(snapshot.household?.members).toHaveLength(1);
      expect(snapshot.budget.transactions).toEqual([]);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

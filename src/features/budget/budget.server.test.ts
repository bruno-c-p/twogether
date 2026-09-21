import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const t = transaction(b.snapshot.user!.id);
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: { ...t, createdBy: "forged", updatedBy: "forged" },
    });
    const received = (await store.snapshot(b.session)).budget.transactions[0];
    expect(received.memberId).toBe(a.snapshot.user!.id);
    expect(received.createdBy).toBe(a.snapshot.user!.id);
    const bia = await withHousehold(store, b.session);
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...received, amount: 15000 },
    });
    const edited = (await store.snapshot(a.session)).budget.transactions[0];
    expect(edited.memberId).toBe(a.snapshot.user!.id);
    expect(edited.amount).toBe(15000);
    expect(edited.updatedBy).toBe(b.snapshot.user!.id);
    expect(edited.createdBy).toBe(a.snapshot.user!.id);
  });

  test("stale edits fail and unrelated concurrent additions survive", async () => {
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(a.snapshot.user!.id),
    });
    const old = (await store.snapshot(a.session)).budget.transactions[0];
    const bia = await withHousehold(store, b.session);
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
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      2,
    );
    expect(
      (await store.snapshot(a.session)).budget.transactions.find(
        (row) => row.id === old.id,
      )?.amount,
    ).toBe(20000);
  });

  test("retrying a create whose response was lost succeeds instead of conflicting", async () => {
    const { store, deliveries } = ctx;
    const { a } = await householdReady(store, deliveries);
    const t = transaction(a.snapshot.user!.id);
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, { transaction: t });
    await store.saveTransaction(ana.user, ana.household, { transaction: t });
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      1,
    );
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: { ...t, amount: 999 },
      }),
    ).rejects.toThrow("mudou");
  });

  test("deletion undo restores only that transaction, never a whole stale budget", async () => {
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const ana = await withHousehold(store, a.session);
    const bia = await withHousehold(store, b.session);
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
    const restored = (await store.snapshot(b.session)).budget.transactions;
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

  test("couples are isolated and transaction attribution comes from the session", async () => {
    const { store, deliveries } = ctx;
    const { a } = await householdReady(store, deliveries);
    const c = await signup(store, deliveries, "Cris");
    await store.createHousehold(await requireUser(store, c.session));
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(c.snapshot.user!.id),
    });
    expect(
      (await store.snapshot(a.session)).budget.transactions[0]?.memberId,
    ).toBe(a.snapshot.user!.id);
    expect((await store.snapshot(c.session)).budget.transactions).toHaveLength(
      0,
    );
    const cris = await withHousehold(store, c.session);
    await expect(
      store.deleteTransaction(cris.user, cris.household, {
        id: "transaction-1",
        revision: 1,
      }),
    ).rejects.toThrow("mudou");
    expect(await store.sessionUser(undefined)).toBeNull();
  });

  test("individual percentages validate totals and reject same-person concurrent overwrite", async () => {
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
    const ana = await withHousehold(store, a.session);
    const bia = await withHousehold(store, b.session);
    await store.savePercentages(ana.user, ana.household, {
      percentages,
      revision: 0,
    });
    expect((await store.snapshot(a.session)).budget.percentages).toEqual(
      percentages,
    );
    expect((await store.snapshot(b.session)).budget.percentages).toEqual(
      DEFAULT_PERCENTAGES,
    );
    await store.savePercentages(bia.user, bia.household, {
      percentages: DEFAULT_PERCENTAGES,
      revision: 0,
    });
    expect((await store.snapshot(a.session)).budget.percentages).toEqual(
      percentages,
    );
    expect(
      (await store.snapshot(b.session)).household?.members.find(
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

  test("data and sessions survive reopening the database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-test-"));
    const file = join(dir, "test.sqlite");
    const deliveries: { email: string; token: string; invite?: string }[] = [];
    let disk = createBudgetStore(file, {
      sendMagicLink: async (message) => {
        deliveries.push(message);
      },
    });
    try {
      await disk.requestLink({ email: "disk@example.test" });
      const a = await disk.verifyLink(
        { token: deliveries.at(-1)!.token },
        undefined,
      );
      const user = (await disk.sessionUser(a.session))!;
      await disk.setName(user, "Ana");
      await disk.createHousehold((await disk.sessionUser(a.session))!);
      const actor = {
        user: (await disk.sessionUser(a.session))!,
        household: (await disk.householdFor(
          (await disk.sessionUser(a.session))!,
        ))!,
      };
      await disk.saveAccount(actor.user, actor.household, account());
      await disk.saveTransaction(actor.user, actor.household, {
        transaction: transaction(user.id),
      });
      disk.close();
      disk = createBudgetStore(file);
      const reopened = (await disk.snapshot(a.session)).budget.transactions;
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
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const original = {
      ...transaction(a.snapshot.user!.id),
      date: "2028-01-31",
    };
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: original,
      occurrences: 3,
    });
    const rows = (await store.snapshot(a.session)).budget.transactions.sort(
      (left, right) => left.date.localeCompare(right.date),
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
    const bia = await withHousehold(store, b.session);
    await store.saveTransaction(bia.user, bia.household, {
      transaction: { ...rows[1], amount: 20000 },
    });
    expect(
      (await store.snapshot(a.session)).budget.transactions.filter(
        (row) => row.amount === 20000,
      ),
    ).toHaveLength(1);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: original,
      occurrences: 3,
    });
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      3,
    );
    await expect(
      store.saveTransaction(ana.user, ana.household, {
        transaction: rows[0],
        occurrences: 3,
      }),
    ).rejects.toThrow("individualmente");
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      3,
    );
  });

  test("rejects invalid counts and rolls back dates beyond supported range", async () => {
    const { store, deliveries } = ctx;
    const { a } = await householdReady(store, deliveries);
    const original = transaction(a.snapshot.user!.id);
    const ana = await withHousehold(store, a.session);
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
    expect((await store.snapshot(a.session)).budget.transactions).toHaveLength(
      0,
    );
  });
});

test("deletes only the selected series from its original occurrence onward and rejects stale batches", async () => {
  const { store, deliveries } = ctx;
  const { a, b } = await householdReady(store, deliveries);
  const original = transaction(a.snapshot.user!.id);
  const ana = await withHousehold(store, a.session);
  const bia = await withHousehold(store, b.session);
  await store.saveTransaction(ana.user, ana.household, {
    transaction: original,
    occurrences: 4,
  });
  await store.saveTransaction(ana.user, ana.household, {
    transaction: { ...original, id: "other" },
    occurrences: 4,
  });
  const snapshot = await store.snapshot(a.session);
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
    const { store, deliveries } = ctx;
    const { a, b } = await couple(store, deliveries);
    const ana = await withHousehold(store, a.session);
    await store.saveAccount(ana.user, ana.household, account());
    expect((await store.snapshot(a.session)).budget.accounts).toEqual([
      { id: "account-1", name: "Nubank", openingBalance: 0, revision: 1 },
    ]);
    expect((await store.snapshot(b.session)).budget.accounts).toHaveLength(1);
    const current = (await store.snapshot(a.session)).budget.accounts[0];
    const bia = await withHousehold(store, b.session);
    await store.saveAccount(bia.user, bia.household, {
      ...current,
      name: "Itaú",
    });
    expect((await store.snapshot(a.session)).budget.accounts[0]?.name).toBe(
      "Itaú",
    );
  });

  test("stores an opening balance on the account", async () => {
    const { store, deliveries } = ctx;
    const { a } = await couple(store, deliveries);
    const ana = await withHousehold(store, a.session);
    await store.saveAccount(ana.user, ana.household, {
      ...account("balance"),
      openingBalance: 250000,
    });
    expect(
      (await store.snapshot(a.session)).budget.accounts.find(
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
    const { store, deliveries } = ctx;
    const a = await signup(store, deliveries, "Ana");
    await store.createHousehold(await requireUser(store, a.session));
    const ana = await withHousehold(store, a.session);
    const userId = (await store.snapshot(a.session)).user!.id;
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
      (await store.snapshot(a.session)).budget.transactions[0]?.accountId,
    ).toBe("account-1");
  });

  test("rejects deleting an account still used by a transaction", async () => {
    const { store, deliveries } = ctx;
    const { a } = await householdReady(store, deliveries);
    const ana = await withHousehold(store, a.session);
    await store.saveTransaction(ana.user, ana.household, {
      transaction: transaction(a.snapshot.user!.id),
    });
    await expect(
      store.deleteAccount(ana.user, ana.household, {
        id: "account-1",
        revision: 1,
      }),
    ).rejects.toThrow("transações desta conta");
    expect((await store.snapshot(a.session)).budget.accounts).toHaveLength(1);
    await store.deleteTransaction(ana.user, ana.household, {
      id: "transaction-1",
      revision: 1,
    });
    await store.deleteAccount(ana.user, ana.household, {
      id: "account-1",
      revision: 1,
    });
    expect((await store.snapshot(a.session)).budget.accounts).toHaveLength(0);
  });

  test("stale account edits fail and households stay isolated", async () => {
    const { store, deliveries } = ctx;
    const { a, b } = await householdReady(store, deliveries);
    const old = (await store.snapshot(a.session)).budget.accounts[0];
    const bia = await withHousehold(store, b.session);
    await store.saveAccount(bia.user, bia.household, {
      ...old,
      name: "Caixa",
    });
    const ana = await withHousehold(store, a.session);
    await expect(
      store.saveAccount(ana.user, ana.household, {
        ...old,
        name: "Bradesco",
      }),
    ).rejects.toThrow("mudou");
    const c = await signup(store, deliveries, "Cris");
    await store.createHousehold(await requireUser(store, c.session));
    const cris = await withHousehold(store, c.session);
    await expect(
      store.deleteAccount(cris.user, cris.household, {
        id: "account-1",
        revision: 2,
      }),
    ).rejects.toThrow("mudou");
    expect((await store.snapshot(c.session)).budget.accounts).toHaveLength(0);
  });
});

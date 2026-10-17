import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "@/server/store.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { Transaction } from "@/features/budget/domain/types";
import {
  couple,
  requireUser,
  signup,
  setupMemoryStore,
  view,
  withHousehold,
} from "@/server/store-test-harness";
import { transaction } from "@/features/budget/transaction-fixture";
import { cents } from "@/test/cents";

const ctx = setupMemoryStore();

describe("budget store", () => {
  test("new transactions use the logged-in member and edits preserve attribution", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const t = transaction(b.user.id);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: { ...t, createdBy: "forged", updatedBy: "forged" },
    });
    const received = (await view(store, b.user)).budget.transactions[0];
    expect(received.memberId).toBe(a.user.id);
    expect(received.createdBy).toBe(a.user.id);
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.householdId, {
      transaction: { ...received, amount: cents(15000) },
    });
    const edited = (await view(store, a.user)).budget.transactions[0];
    expect(edited.memberId).toBe(a.user.id);
    expect(edited.amount).toBe(cents(15000));
    expect(edited.updatedBy).toBe(b.user.id);
    expect(edited.createdBy).toBe(a.user.id);
  });

  test("stale edits fail and unrelated concurrent additions survive", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: transaction(a.user.id),
    });
    const old = (await view(store, a.user)).budget.transactions[0];
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.householdId, {
      transaction: { ...old, amount: cents(20000) },
    });
    await expect(
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: { ...old, amount: cents(1) },
      }),
    ).rejects.toThrow("mudou");
    await store.saveTransaction(bia.user, bia.householdId, {
      transaction: { ...transaction(b.user.id), id: "second" },
    });
    expect((await view(store, a.user)).budget.transactions).toHaveLength(2);
    expect(
      (await view(store, a.user)).budget.transactions.find(
        (row) => row.id === old.id,
      )?.amount,
    ).toBe(cents(20000));
  });

  test("retrying a create whose response was lost succeeds instead of conflicting", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const t = transaction(a.user.id);
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.householdId, { transaction: t });
    await store.saveTransaction(ana.user, ana.householdId, { transaction: t });
    expect((await view(store, a.user)).budget.transactions).toHaveLength(1);
    await expect(
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: { ...t, amount: cents(999) },
      }),
    ).rejects.toThrow("mudou");
  });

  test("deletion undo restores only that transaction, never a whole stale budget", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await withHousehold(store, a.user);
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: transaction(a.user.id),
    });
    await store.deleteTransaction(bia.user, bia.householdId, {
      id: "transaction-1",
      revision: 1,
    });
    await store.saveTransaction(bia.user, bia.householdId, {
      transaction: { ...transaction(b.user.id), id: "second" },
    });
    await store.restoreTransaction(ana.user, ana.householdId, {
      id: "transaction-1",
      revision: 2,
    });
    const restored = (await view(store, b.user)).budget.transactions;
    expect(restored).toHaveLength(2);
    expect(restored.find((row) => row.id === "transaction-1")?.amount).toBe(
      cents(10000),
    );
    expect(restored.find((row) => row.id === "second")?.amount).toBe(
      cents(10000),
    );
    await expect(
      store.restoreTransaction(ana.user, ana.householdId, {
        id: "transaction-1",
        revision: 2,
      }),
    ).rejects.toThrow("mudou");
  });

  test("couples are isolated and transaction attribution comes from the member", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const c = await signup(store, "Cris");
    await store.createHousehold(await requireUser(store, c.user));
    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: transaction(c.user.id),
    });
    expect((await view(store, a.user)).budget.transactions[0]?.memberId).toBe(
      a.user.id,
    );
    expect((await view(store, c.user)).budget.transactions).toHaveLength(0);
    const cris = await withHousehold(store, c.user);
    await expect(
      store.deleteTransaction(cris.user, cris.householdId, {
        id: "transaction-1",
        revision: 1,
      }),
    ).rejects.toThrow("mudou");
  });

  test("individual percentages are per member and reject same-person concurrent overwrite", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const percentages = { ...DEFAULT_PERCENTAGES, fixed: 20, targets: 25 };
    const ana = await withHousehold(store, a.user);
    const bia = await withHousehold(store, b.user);
    await store.savePercentages(ana.user, {
      percentages,
      revision: 0,
    });
    expect((await view(store, a.user)).budget.percentages).toEqual(percentages);
    expect((await view(store, b.user)).budget.percentages).toEqual(
      DEFAULT_PERCENTAGES,
    );
    await store.savePercentages(bia.user, {
      percentages: DEFAULT_PERCENTAGES,
      revision: 0,
    });
    expect((await view(store, a.user)).budget.percentages).toEqual(percentages);
    expect(
      (await view(store, b.user)).household?.members.find(
        (member) => member.id === a.user.id,
      )?.percentages,
    ).toEqual(percentages);
    await expect(
      store.savePercentages(ana.user, {
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).rejects.toThrow("mudou");
  });

  test("data survives reopening the database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-test-"));
    const file = join(dir, "test.sqlite");
    let disk = createStore(file);

    try {
      const user = await disk.ensureUser("user_disk");
      await disk.setName(user, "Ana");
      await disk.createHousehold(await disk.ensureUser("user_disk"));

      const actor = await withHousehold(disk, user);

      await disk.saveTransaction(actor.user, actor.householdId, {
        transaction: transaction(user.id),
      });
      disk.close();
      disk = createStore(file);

      const reopened = (await view(disk, user)).budget.transactions;

      expect(reopened).toHaveLength(1);
      expect(reopened[0]?.id).toBe("transaction-1");
      expect(reopened[0]?.amount).toBe(cents(10000));
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
    const { a, b } = await couple(store);

    const original = {
      ...transaction(a.user.id),
      date: "2028-01-31",
    };

    const ana = await withHousehold(store, a.user);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: original,
      occurrences: 3,
    });

    const rows = (await view(store, a.user)).budget.transactions.sort(
      (left, right) => left.date.localeCompare(right.date),
    );

    expect(rows.map((row) => row.date)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect((await view(store, b.user)).budget.transactions).toHaveLength(3);
    const bia = await withHousehold(store, b.user);
    await store.saveTransaction(bia.user, bia.householdId, {
      transaction: { ...rows[1], amount: cents(20000) },
    });
    expect(
      (await view(store, a.user)).budget.transactions.filter(
        (row) => row.amount === 20000,
      ),
    ).toHaveLength(1);
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: original,
      occurrences: 3,
    });
    expect((await view(store, a.user)).budget.transactions).toHaveLength(3);
    await expect(
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: rows[0],
        occurrences: 3,
      }),
    ).rejects.toThrow("individualmente");
    expect((await view(store, a.user)).budget.transactions).toHaveLength(3);
  });

  test("rolls back dates beyond supported range", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const original = transaction(a.user.id);
    const ana = await withHousehold(store, a.user);

    await expect(
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: { ...original, date: "9999-12-31" },
        occurrences: 2,
      }),
    ).rejects.toThrow();
    expect((await view(store, a.user)).budget.transactions).toHaveLength(0);
  });
});

test("deletes only the selected series from its original occurrence onward and rejects stale batches", async () => {
  const { store } = ctx;
  const { a, b } = await couple(store);
  const original = transaction(a.user.id);
  const ana = await withHousehold(store, a.user);
  const bia = await withHousehold(store, b.user);
  await store.saveTransaction(ana.user, ana.householdId, {
    transaction: original,
    occurrences: 4,
  });
  await store.saveTransaction(ana.user, ana.householdId, {
    transaction: { ...original, id: "other" },
    occurrences: 4,
  });
  const snapshot = await view(store, a.user);

  const series = snapshot.budget.transactions
    .filter(
      (item) =>
        item.recurrenceId ===
        snapshot.budget.transactions.find((item) => item.id === original.id)!
          .recurrenceId,
    )
    .sort((left, right) => left.recurrenceIndex! - right.recurrenceIndex!);

  await store.saveTransaction(bia.user, bia.householdId, {
    transaction: { ...series[2], date: "2020-01-01" },
  });

  const remove = (following: Transaction[]) =>
    store.deleteTransaction(ana.user, ana.householdId, {
      id: series[1].id,
      revision: series[1].revision ?? 0,
      following: following.map((item) => ({
        id: item.id,
        revision: item.revision ?? 0,
      })),
    });

  await expect(remove(series.slice(2))).rejects.toThrow();
  expect((await view(store, a.user)).budget.transactions).toHaveLength(8);
  const current = (await view(store, a.user)).budget.transactions;
  await remove(
    current.filter(
      (item) =>
        item.recurrenceId === series[0].recurrenceId &&
        item.recurrenceIndex! > 1,
    ),
  );
  const remaining = (await view(store, b.user)).budget.transactions;
  expect(remaining).toHaveLength(5);
  expect(
    remaining
      .filter((item) => item.recurrenceId === series[0].recurrenceId)
      .map((item) => item.id),
  ).toEqual([series[0].id]);
});

describe("month snapshot", () => {
  test("carries the month, unpaid splits and later occurrences of its series", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await withHousehold(store, a.user);
    const bia = await withHousehold(store, b.user);

    const save = (id: string, date: string, extra: Partial<Transaction> = {}) =>
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: { ...transaction(ana.user.id), id, date, ...extra },
      });

    await save("august", "2026-08-31");
    await save("september", "2026-09-01");
    await save("late-september", "2026-09-30");
    await save("october", "2026-10-01");
    await save("open-split", "2026-01-10", { split: {} });
    await save("paid-split", "2026-02-10", { split: {} });
    await store.settleSplit(bia.user, bia.householdId, {
      id: "paid-split",
      revision: 1,
      date: "2026-02-11",
    });
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: {
        ...transaction(ana.user.id),
        id: "rent",
        date: "2026-08-05",
      },
      occurrences: 3,
    });

    // Server-minted ids (series occurrences, repayments) read as their origin.
    const label = (row: Transaction) =>
      row.settlementOf
        ? `repayment-${row.kind}`
        : row.recurrenceId
          ? "rent"
          : row.id;

    const ids = async (month: string) =>
      (
        await store.snapshot(ana.user, ana.householdId, month)
      ).budget.transactions
        .map((row) => `${label(row)}:${row.date}`)
        .sort();

    expect(await ids("2026-09")).toEqual([
      "late-september:2026-09-30",
      "open-split:2026-01-10",
      "rent:2026-09-05",
      "rent:2026-10-05",
      "september:2026-09-01",
    ]);
    expect(await ids("2026-02")).toEqual([
      "open-split:2026-01-10",
      "paid-split:2026-02-10",
      "repayment-expense:2026-02-11",
      "repayment-income:2026-02-11",
    ]);
    expect(
      (await store.snapshot(ana.user, ana.householdId)).budget.transactions,
    ).toHaveLength(11);
  });
});

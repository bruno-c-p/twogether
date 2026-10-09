import { describe, expect, test } from "bun:test";
import type { Transaction } from "@/features/budget/domain/types";
import {
  couple,
  signup,
  transaction,
  setupMemoryStore,
  view,
  withHousehold,
} from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

function rent(memberId: string): Transaction {
  return {
    ...transaction(memberId),
    id: "rent",
    description: "Aluguel",
    amount: 200001,
    split: {},
  };
}

async function setup() {
  const { store } = ctx;
  const { a, b } = await couple(store);
  const ana = await withHousehold(store, a.user);
  const bia = await withHousehold(store, b.user);
  await store.saveTransaction(ana.user, ana.householdId, {
    transaction: rent(ana.user.id),
  });

  const find = async (id = "rent") =>
    (await view(store, ana.user)).budget.transactions.find(
      (row) => row.id === id,
    )!;

  return { store, ana, bia, find };
}

const settleInput = {
  id: "rent",
  revision: 1,
  date: "2026-09-20",
};

describe("split transactions", () => {
  test("stores an unpaid split and rejects a split in a solo household", async () => {
    const { store, find } = await setup();
    expect((await find()).split).toEqual({});
    const solo = await signup(store, "Cris");
    await store.createHousehold(solo.user);
    const cris = await withHousehold(store, solo.user);
    await expect(
      store.saveTransaction(cris.user, cris.householdId, {
        transaction: rent(cris.user.id),
      }),
    ).rejects.toThrow("Convide a outra pessoa");
  });

  test("the partner settles, creating an income for the payer and an expense for the partner", async () => {
    const { store, ana, bia, find } = await setup();
    await store.settleSplit(bia.user, bia.householdId, settleInput);
    const all = (await view(store, bia.user)).budget.transactions;
    const original = all.find((row) => row.id === "rent")!;
    expect(original.split?.paidBy).toBe(bia.user.id);
    expect(original.split?.entryIds).toHaveLength(2);
    expect(original.revision).toBe(2);
    const entries = all.filter((row) => row.settlementOf === "rent");
    const income = entries.find((row) => row.kind === "income")!;
    const expense = entries.find((row) => row.kind === "expense")!;
    expect(income).toMatchObject({
      amount: 100000,
      memberId: ana.user.id,
      date: "2026-09-20",
      goal: null,
      description: "Reembolso: Aluguel",
    });
    expect(expense).toMatchObject({
      amount: 100000,
      memberId: bia.user.id,
      date: "2026-09-20",
      goal: "fixed",
    });
    expect((await find()).amount).toBe(200001);
  });

  test("only the person who owes can settle or unsettle", async () => {
    const { store, ana, bia } = await setup();
    await expect(
      store.settleSplit(ana.user, ana.householdId, settleInput),
    ).rejects.toThrow("Só quem deve");
    await store.settleSplit(bia.user, bia.householdId, settleInput);
    await expect(
      store.unsettleSplit(ana.user, ana.householdId, {
        id: "rent",
        revision: 2,
      }),
    ).rejects.toThrow("Só quem deve");
  });

  test("unsettle removes both entries and restores the debt", async () => {
    const { store, bia, find } = await setup();
    await store.settleSplit(bia.user, bia.householdId, settleInput);
    await store.unsettleSplit(bia.user, bia.householdId, {
      id: "rent",
      revision: 2,
    });
    const all = (await view(store, bia.user)).budget.transactions;
    expect(all).toHaveLength(1);
    expect((await find()).split).toEqual({});
    await store.settleSplit(bia.user, bia.householdId, {
      ...settleInput,
      revision: 3,
    });
    expect((await view(store, bia.user)).budget.transactions).toHaveLength(3);
  });

  test("stale settle attempts conflict", async () => {
    const { store, ana, bia } = await setup();
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: {
        ...rent(ana.user.id),
        description: "Aluguel set",
        revision: 1,
      },
    });
    await expect(
      store.settleSplit(bia.user, bia.householdId, settleInput),
    ).rejects.toThrow("mudou");
    await store.settleSplit(bia.user, bia.householdId, {
      ...settleInput,
      revision: 2,
    });
    await expect(
      store.settleSplit(bia.user, bia.householdId, {
        ...settleInput,
        revision: 3,
      }),
    ).rejects.toThrow("mudou");
  });

  test("a paid split locks amount, kind, split and deletion but allows other edits", async () => {
    const { store, ana, bia, find } = await setup();
    await store.settleSplit(bia.user, bia.householdId, settleInput);
    const paid = await find();

    for (const change of [
      { amount: 1000 },
      { split: undefined },
      { kind: "income" as const, goal: null },
    ])
      await expect(
        store.saveTransaction(ana.user, ana.householdId, {
          transaction: { ...paid, ...change },
        }),
      ).rejects.toThrow(/Desmarque o pagamento|Só despesas/);
    await expect(
      store.deleteTransaction(ana.user, ana.householdId, {
        id: "rent",
        revision: 2,
      }),
    ).rejects.toThrow("Desmarque o pagamento");
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: { ...paid, description: "Aluguel setembro", split: {} },
    });
    const edited = await find();
    expect(edited.description).toBe("Aluguel setembro");
    expect(edited.split?.paidAt).toBe(paid.split?.paidAt);
    expect(edited.split?.entryIds).toEqual(paid.split?.entryIds);
  });

  test("repayment entries cannot be edited, deleted or restored directly", async () => {
    const { store, ana, bia } = await setup();
    await store.settleSplit(bia.user, bia.householdId, settleInput);

    const entry = (await view(store, ana.user)).budget.transactions.find(
      (row) => row.settlementOf,
    )!;

    await expect(
      store.saveTransaction(ana.user, ana.householdId, {
        transaction: { ...entry, amount: 5 },
      }),
    ).rejects.toThrow("reembolso");
    await expect(
      store.deleteTransaction(ana.user, ana.householdId, {
        id: entry.id,
        revision: entry.revision!,
      }),
    ).rejects.toThrow("reembolso");
    await store.unsettleSplit(bia.user, bia.householdId, {
      id: "rent",
      revision: 2,
    });
    await expect(
      store.restoreTransaction(ana.user, ana.householdId, {
        id: entry.id,
        revision: entry.revision! + 1,
      }),
    ).rejects.toThrow("reembolso");
  });

  test("recurring splits get an independent paid status per occurrence", async () => {
    const { store, ana, bia } = await setup();
    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: { ...rent(ana.user.id), id: "series" },
      occurrences: 3,
    });

    const series = (await view(store, ana.user)).budget.transactions.filter(
      (row) => row.recurrenceId,
    );

    expect(series).toHaveLength(3);
    expect(series.every((row) => row.split && !row.split.paidAt)).toBe(true);
    await store.settleSplit(bia.user, bia.householdId, {
      ...settleInput,
      id: "series",
    });

    const after = (await view(store, ana.user)).budget.transactions.filter(
      (row) => row.recurrenceId,
    );

    expect(after.filter((row) => row.split?.paidAt)).toHaveLength(1);
    await expect(
      store.deleteTransaction(ana.user, ana.householdId, {
        id: "series",
        revision: 2,
        following: after
          .filter((row) => row.id !== "series")
          .map((row) => ({ id: row.id, revision: row.revision! })),
      }),
    ).rejects.toThrow("Desmarque o pagamento");
  });
});

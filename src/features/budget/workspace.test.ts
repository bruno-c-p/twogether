import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  loadCachedWorkspace,
  optimisticDelete,
  optimisticRestore,
  optimisticSave,
  workspaceQueryKey,
  workspaceQueryOptions,
} from "@/features/budget/workspace";

const mercado: Transaction = {
  id: "tx-1",
  description: "Mercado",
  amount: 4590,
  kind: "expense",
  date: "2026-09-14",
  goal: "fixed",
  revision: 1,
  memberId: "ana",
  createdBy: "ana",
};

const snapshot: WorkspaceSnapshot = {
  user: { id: "ana", name: "Ana" },
  household: {
    id: "home",
    members: [
      {
        id: "ana",
        name: "Ana",
        percentages: DEFAULT_PERCENTAGES,
        percentagesRevision: 0,
      },
    ],
  },
  budget: {
    percentages: DEFAULT_PERCENTAGES,
    transactions: [mercado],
  },
};

describe("loadCachedWorkspace", () => {
  it("returns the snapshot already in memory without waiting", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    });

    queryClient.setQueryData(
      workspaceQueryOptions("2026-09").queryKey,
      snapshot,
    );

    expect(loadCachedWorkspace(queryClient, "2026-09")).toBe(snapshot);
    expect(queryClient.isFetching({ queryKey: workspaceQueryKey })).toBe(0);
  });
});

describe("optimisticSave", () => {
  it("inserts a new transaction for the signed-in person", () => {
    const salary: Transaction = {
      id: "tx-2",
      description: "Salário",
      amount: 500000,
      kind: "income",
      date: "2026-09-01",
      goal: null,
    };

    const next = optimisticSave(snapshot, { transaction: salary });
    expect(next.budget.transactions).toEqual([
      mercado,
      {
        ...salary,
        memberId: "ana",
        createdBy: "ana",
        revision: 1,
        recurrenceId: undefined,
        recurrenceIndex: undefined,
      },
    ]);
  });

  it("replaces an existing transaction and bumps the revision", () => {
    const next = optimisticSave(snapshot, {
      transaction: { ...mercado, description: "Feira", revision: 1 },
    });

    expect(next.budget.transactions).toEqual([
      { ...mercado, description: "Feira", revision: 2 },
    ]);
  });
});

describe("optimisticDelete", () => {
  it("removes the row and any following occurrences", () => {
    const later: Transaction = { ...mercado, id: "tx-2", recurrenceIndex: 1 };

    const withSeries: WorkspaceSnapshot = {
      ...snapshot,
      budget: { ...snapshot.budget, transactions: [mercado, later] },
    };

    expect(
      optimisticDelete(withSeries, {
        id: "tx-1",
        following: [{ id: "tx-2" }],
      }).budget.transactions,
    ).toEqual([]);
  });
});

describe("optimisticRestore", () => {
  it("puts the transaction back with the post-restore revision", () => {
    const empty: WorkspaceSnapshot = {
      ...snapshot,
      budget: { ...snapshot.budget, transactions: [] },
    };

    expect(optimisticRestore(empty, mercado).budget.transactions).toEqual([
      { ...mercado, revision: 3 },
    ]);
  });
});

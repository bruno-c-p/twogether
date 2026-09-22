import { queryOptions } from "@tanstack/react-query";
import { loadWorkspace } from "@/features/budget/actions";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";

export const workspaceQueryKey = ["workspace"] as const;

export const workspaceQueryOptions = queryOptions({
  queryKey: workspaceQueryKey,
  queryFn: loadWorkspace,
});

export function optimisticSave(
  snapshot: WorkspaceSnapshot,
  input: { transaction: Transaction; occurrences?: number },
): WorkspaceSnapshot {
  const existing = snapshot.budget.transactions.find(
    (item) => item.id === input.transaction.id,
  );
  const next: Transaction = {
    ...input.transaction,
    memberId: existing?.memberId ?? snapshot.user.id,
    createdBy: existing?.createdBy ?? snapshot.user.id,
    revision: existing ? (existing.revision ?? 0) + 1 : 1,
    recurrenceId: existing?.recurrenceId,
    recurrenceIndex: existing?.recurrenceIndex,
  };
  const transactions = existing
    ? snapshot.budget.transactions.map((item) =>
        item.id === next.id ? next : item,
      )
    : [...snapshot.budget.transactions, next];
  // ponytail: extra recurrence rows wait for refetch; the server mints their UUIDs
  return { ...snapshot, budget: { ...snapshot.budget, transactions } };
}

export function optimisticDelete(
  snapshot: WorkspaceSnapshot,
  input: {
    id: string;
    following?: { id: string }[];
  },
): WorkspaceSnapshot {
  const ids = new Set([
    input.id,
    ...(input.following?.map((item) => item.id) ?? []),
  ]);
  return {
    ...snapshot,
    budget: {
      ...snapshot.budget,
      transactions: snapshot.budget.transactions.filter(
        (item) => !ids.has(item.id),
      ),
    },
  };
}

export function optimisticRestore(
  snapshot: WorkspaceSnapshot,
  transaction: Transaction,
): WorkspaceSnapshot {
  if (snapshot.budget.transactions.some((item) => item.id === transaction.id)) {
    return snapshot;
  }
  return {
    ...snapshot,
    budget: {
      ...snapshot.budget,
      transactions: [
        ...snapshot.budget.transactions,
        { ...transaction, revision: (transaction.revision ?? 0) + 2 },
      ],
    },
  };
}

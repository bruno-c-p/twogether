import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { loadWorkspace } from "@/features/budget/actions";
import { shiftMonth } from "@/features/budget/domain/format";
import { now } from "@/lib/clock";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";

export const workspaceQueryKey = ["workspace"] as const;

// One cache entry per month, so a page load carries one month of history
// instead of all of it.
export const workspaceQueryOptions = (month: string) =>
  queryOptions({
    queryKey: [...workspaceQueryKey, month],
    queryFn: () => loadWorkspace({ data: { month } }),
  });

export function hasCachedWorkspace(queryClient: QueryClient) {
  return queryClient
    .getQueriesData<WorkspaceSnapshot>({ queryKey: workspaceQueryKey })
    .some(([, snapshot]) => snapshot !== undefined);
}

// Page changes re-run the layout loader. Paint the snapshot already in
// memory and let a stale copy refresh behind the new screen.
export function loadCachedWorkspace(
  queryClient: QueryClient,
  month: string,
): WorkspaceSnapshot | Promise<WorkspaceSnapshot> {
  const options = workspaceQueryOptions(month);
  const cached = queryClient.getQueryData(options.queryKey);

  if (cached) {
    void queryClient.prefetchQuery(options).catch(() => undefined);

    return cached;
  }

  return queryClient.ensureQueryData(options);
}

export function prefetchMonth(queryClient: QueryClient, month: string) {
  void queryClient
    .prefetchQuery(workspaceQueryOptions(month))
    .catch(() => undefined);
}

// The months next to the one on screen, so stepping back or forward paints
// from memory.
export function prefetchNearbyMonths(queryClient: QueryClient, month: string) {
  prefetchMonth(queryClient, shiftMonth(month, -1));
  prefetchMonth(queryClient, shiftMonth(month, 1));
}

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

function replaceTransaction(
  snapshot: WorkspaceSnapshot,
  id: string,
  update: (transaction: Transaction) => Transaction,
  drop: string[] = [],
): WorkspaceSnapshot {
  const dropped = new Set(drop);

  return {
    ...snapshot,
    budget: {
      ...snapshot.budget,
      transactions: snapshot.budget.transactions
        .filter((item) => !dropped.has(item.id))
        .map((item) => (item.id === id ? update(item) : item)),
    },
  };
}

export function optimisticSettle(
  snapshot: WorkspaceSnapshot,
  input: { id: string },
): WorkspaceSnapshot {
  // ponytail: the repayment rows wait for refetch; the server mints their UUIDs
  return replaceTransaction(snapshot, input.id, (item) => ({
    ...item,
    split: { paidAt: now().toISOString(), paidBy: snapshot.user.id },
    revision: (item.revision ?? 0) + 1,
  }));
}

export function optimisticUnsettle(
  snapshot: WorkspaceSnapshot,
  input: { id: string },
): WorkspaceSnapshot {
  const source = snapshot.budget.transactions.find(
    (item) => item.id === input.id,
  );

  const drop = snapshot.budget.transactions
    .filter((item) => item.settlementOf === input.id)
    .map((item) => item.id)
    .concat(source?.split?.entryIds ?? []);

  return replaceTransaction(
    snapshot,
    input.id,
    (item) => ({ ...item, split: {}, revision: (item.revision ?? 0) + 1 }),
    drop,
  );
}

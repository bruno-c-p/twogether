import { useSuspenseQuery } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { failureMessage } from "@/features/budget/hooks/use-mutation";
import { workspaceQueryOptions } from "@/features/budget/workspace";

const SYNC_OFFLINE_MESSAGE =
  "Sem conexão com o servidor. Tentaremos sincronizar novamente.";

// The workspace loader runs ensureQueryData first, so the snapshot is
// already cached; a failed background refetch keeps it and reports why.
export function useBudget(month: string) {
  const query = useSuspenseQuery(workspaceQueryOptions(month));

  const syncError =
    query.error && !isRedirect(query.error)
      ? failureMessage(query.error, SYNC_OFFLINE_MESSAGE)
      : "";

  return {
    state: query.data.budget,
    user: query.data.user,
    household: query.data.household,
    syncError,
  };
}

export type BudgetController = ReturnType<typeof useBudget>;

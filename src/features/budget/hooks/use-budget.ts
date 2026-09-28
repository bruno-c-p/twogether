import { useQuery } from "@tanstack/react-query";
import { getRouteApi, isRedirect } from "@tanstack/react-router";
import { workspaceQueryOptions } from "@/features/budget/workspace";

const workspaceRoute = getRouteApi("/_authenticated/");

function syncMessage(error: unknown) {
  if (error instanceof Error && !(error instanceof TypeError)) {
    return error.message;
  }
  return "Sem conexão com o servidor. Tentaremos sincronizar novamente.";
}

export function useBudget() {
  const initial = workspaceRoute.useLoaderData();
  const query = useQuery(workspaceQueryOptions);

  const snapshot = query.data ?? initial;
  const syncError =
    query.error && !isRedirect(query.error) ? syncMessage(query.error) : "";

  return {
    state: snapshot.budget,
    user: snapshot.user,
    household: snapshot.household,
    syncError,
    refresh: query.refetch,
  };
}
export type BudgetController = ReturnType<typeof useBudget>;

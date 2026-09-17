import { useQuery } from "@tanstack/react-query";
import { getRouteApi, isRedirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  fetchWorkspace,
  workspaceQueryKeyFor,
} from "@/features/budget/workspace";

const workspaceRoute = getRouteApi("/");

function syncMessage(error: unknown) {
  if (error instanceof Error && !(error instanceof TypeError)) {
    return error.message;
  }
  return "Sem conexão com o servidor. Tentaremos sincronizar novamente.";
}

export function useBudget() {
  const router = useRouter();
  const initial = workspaceRoute.useLoaderData();
  const query = useQuery({
    queryKey: workspaceQueryKeyFor(initial.user.id),
    queryFn: fetchWorkspace,
    initialData: initial,
  });

  useEffect(() => {
    if (!query.error) return;
    if (isRedirect(query.error)) {
      void router.navigate(router.resolveRedirect(query.error).options);
    }
  }, [query.error, router]);

  const snapshot = query.data;
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

import { createFileRoute, redirect } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import {
  gateRedirectSearch,
  missingWorkspaceMonth,
  validateBudgetSearch,
  withDefaultMonth,
} from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";
import { workspaceQueryOptions } from "@/features/budget/workspace";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";

function BudgetPending() {
  return <LoadingState>Carregando orçamento…</LoadingState>;
}

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateBudgetSearch,
  loaderDeps: ({ search }) => ({
    convite: search.convite,
  }),
  beforeLoad: ({ search }) => {
    if (missingWorkspaceMonth(search)) {
      throw redirect({
        to: "/",
        search: withDefaultMonth(search),
      });
    }
  },
  loader: async ({ context, deps }): Promise<WorkspaceSnapshot> => {
    if (deps.convite) {
      throw redirect({
        to: "/entrar",
        search: gateRedirectSearch(deps),
      });
    }
    return context.queryClient.ensureQueryData(workspaceQueryOptions);
  },
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

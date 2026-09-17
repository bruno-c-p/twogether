import { createFileRoute, redirect } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/budget.functions";
import {
  gateRedirectSearch,
  missingWorkspaceMonth,
  validateBudgetSearch,
  withDefaultMonth,
} from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";
import { asWorkspaceSnapshot } from "@/features/budget/workspace";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";

function BudgetPending() {
  return <LoadingState>Carregando orçamento…</LoadingState>;
}

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateBudgetSearch,
  loaderDeps: ({ search }) => ({
    access: search.access,
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
  loader: async ({ deps }): Promise<WorkspaceSnapshot> => {
    if (deps.access || deps.convite) {
      throw redirect({
        to: "/entrar",
        search: gateRedirectSearch(deps),
      });
    }
    return asWorkspaceSnapshot(await loadBudget());
  },
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

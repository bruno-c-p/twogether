import { createFileRoute, redirect } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/actions/load-budget";
import {
  gateRedirectSearch,
  validateBudgetSearch,
} from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";
import type {
  SharedSnapshot,
  WorkspaceSnapshot,
} from "@/features/budget/types";

function BudgetPending() {
  return <LoadingState>Carregando orçamento…</LoadingState>;
}

function workspaceSnapshot(snapshot: SharedSnapshot): WorkspaceSnapshot {
  const { user, household, budget } = snapshot;
  if (!user?.name || !household) {
    throw redirect({ to: "/entrar" });
  }
  return { user, household, budget };
}

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateBudgetSearch,
  loaderDeps: ({ search }) => ({
    access: search.access,
    convite: search.convite,
  }),
  loader: async ({ deps }): Promise<WorkspaceSnapshot> => {
    if (deps.access || deps.convite) {
      throw redirect({
        to: "/entrar",
        search: gateRedirectSearch(deps),
      });
    }
    return workspaceSnapshot(await loadBudget());
  },
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

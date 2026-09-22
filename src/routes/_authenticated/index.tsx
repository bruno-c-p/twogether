import { createFileRoute, redirect } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadWorkspace } from "@/features/budget/actions";
import {
  missingWorkspaceMonth,
  validateBudgetFilters,
  withDefaultMonth,
} from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";

function BudgetPending() {
  return <LoadingState>Carregando orçamento…</LoadingState>;
}

export const Route = createFileRoute("/_authenticated/")({
  component: BudgetRoute,
  validateSearch: validateBudgetFilters,
  beforeLoad: ({ search }) => {
    if (missingWorkspaceMonth(search)) {
      throw redirect({
        to: "/",
        search: withDefaultMonth(search),
      });
    }
  },
  loader: async (): Promise<WorkspaceSnapshot> => loadWorkspace(),
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

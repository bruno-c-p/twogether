import { createFileRoute, redirect } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import {
  missingWorkspaceMonth,
  validateBudgetFilters,
  withDefaultMonth,
} from "@/features/budget/search";
import { workspaceQueryOptions } from "@/features/budget/workspace";
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
  loader: async ({ context }): Promise<WorkspaceSnapshot> =>
    context.queryClient.ensureQueryData(workspaceQueryOptions),
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

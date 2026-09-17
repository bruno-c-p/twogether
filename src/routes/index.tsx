import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import {
  consumeAccess,
  loadBudget,
} from "@/features/budget/actions/load-budget";
import { validateBudgetSearch } from "@/features/budget/search";
import { RouteError } from "@/route-error";
import { LoadingState } from "@/ui/empty-state";

function BudgetPending() {
  return (
    <LoadingState>Carregando orçamento…</LoadingState>
  );
}

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateBudgetSearch,
  headers: () => ({ "Cache-Control": "private, no-store" }),
  loaderDeps: ({ search }) => ({
    access: search.access,
    convite: search.convite,
  }),
  loader: async ({ deps }) => {
    if (deps.access) {
      await consumeAccess({
        data: {
          token: deps.access,
          ...(deps.convite ? { convite: deps.convite } : {}),
        },
      });
    }
    return loadBudget();
  },
  pendingComponent: BudgetPending,
  errorComponent: RouteError,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  return <BudgetApp />;
}

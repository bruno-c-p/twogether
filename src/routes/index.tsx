import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/actions/load-budget";
import { validateBudgetSearch } from "@/features/budget/search";
import { RouteError } from "../route-error";

function BudgetPending() {
  return (
    <div className="loading-state" aria-live="polite">
      Carregando orçamento…
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateBudgetSearch,
  loader: () => loadBudget(),
  pendingComponent: BudgetPending,
  errorComponent: RouteError,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  const initialSnapshot = Route.useLoaderData();
  return <BudgetApp initialSnapshot={initialSnapshot} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/actions/load-budget";
import { validateBudgetSearch } from "@/features/budget/search";
import { RouteError } from "@/src/route-error";
import chrome from "@/src/chrome.module.css";

function BudgetPending() {
  return (
    <div className={chrome.loadingState} aria-live="polite">
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

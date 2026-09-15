import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/actions/load-budget";
import { validateAccessSearch } from "@/features/budget/search";

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  validateSearch: validateAccessSearch,
  loader: () => loadBudget(),
});

function BudgetRoute() {
  const initialSnapshot = Route.useLoaderData();
  return <BudgetApp initialSnapshot={initialSnapshot} />;
}

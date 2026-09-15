import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { loadBudget } from "@/features/budget/actions/load-budget";

export const Route = createFileRoute("/")({
  component: BudgetRoute,
  loader: () => loadBudget(),
});

function BudgetRoute() {
  const initialSnapshot = Route.useLoaderData();
  return <BudgetApp initialSnapshot={initialSnapshot} />;
}

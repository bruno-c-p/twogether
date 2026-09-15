import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { validateBudgetSearch } from "@/features/budget/search";

export const Route = createFileRoute("/")({
  component: BudgetApp,
  validateSearch: validateBudgetSearch,
});

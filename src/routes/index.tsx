import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { validateAccessSearch } from "@/features/budget/search";

export const Route = createFileRoute("/")({
  component: BudgetApp,
  validateSearch: validateAccessSearch,
});

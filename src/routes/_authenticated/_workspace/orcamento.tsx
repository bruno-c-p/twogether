import { createFileRoute } from "@tanstack/react-router";
import { BudgetScreen } from "@/features/budget/components/screens/budget-screen";

export const Route = createFileRoute("/_authenticated/_workspace/orcamento")({
  component: BudgetScreen,
});

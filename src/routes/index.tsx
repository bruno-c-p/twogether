import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";
import { RouteError } from "../route-error";

function BudgetPending() {
  return (
    <div className="loading-state" aria-live="polite">
      Carregando orçamento…
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: BudgetApp,
  pendingComponent: BudgetPending,
  errorComponent: RouteError,
  pendingMs: 300,
  pendingMinMs: 500,
});

import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";
import { loadBudget } from "@/features/budget/actions";
import { validateInviteSearch } from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";

function GatePending() {
  return <LoadingState>Carregando…</LoadingState>;
}

export const Route = createFileRoute("/entrar")({
  component: AccountGate,
  validateSearch: validateInviteSearch,
  loader: async () => {
    const snapshot = await loadBudget();
    if (snapshot.user?.name && snapshot.household) {
      throw redirect({ to: "/", search: {} });
    }
    return snapshot;
  },
  pendingComponent: GatePending,
  pendingMs: 300,
  pendingMinMs: 500,
});

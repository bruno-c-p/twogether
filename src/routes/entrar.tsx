import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountGate } from "@/features/auth/components/account-gate";
import { consumeAccess } from "@/features/auth/actions";
import { loadBudget } from "@/features/budget/actions";
import { validateAccessSearch } from "@/features/budget/search";
import { LoadingState } from "@/features/budget/components/empty-state";

function GatePending() {
  return <LoadingState>Carregando…</LoadingState>;
}

export const Route = createFileRoute("/entrar")({
  component: AccountGate,
  validateSearch: validateAccessSearch,
  beforeLoad: async ({ search }) => {
    if (!search.access) return;
    await consumeAccess({
      data: {
        token: search.access,
        ...(search.convite ? { convite: search.convite } : {}),
      },
    });
  },
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

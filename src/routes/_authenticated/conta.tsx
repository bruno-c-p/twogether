import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/auth/components/account-settings";
import { loadHousehold } from "@/features/household/actions";
import { LoadingState } from "@/features/budget/components/empty-state";

function ContaPending() {
  return <LoadingState>Carregando conta…</LoadingState>;
}

export const Route = createFileRoute("/_authenticated/conta")({
  component: ContaRoute,
  loader: async () => loadHousehold(),
  pendingComponent: ContaPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function ContaRoute() {
  return <AccountSettings />;
}

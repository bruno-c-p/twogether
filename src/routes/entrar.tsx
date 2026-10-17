import { createFileRoute } from "@tanstack/react-router";
import { loadGateSession } from "@/features/auth";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";
import { LoadingState } from "@/components/ui/empty-state";

function GatePending() {
  return <LoadingState>Carregando…</LoadingState>;
}

export const Route = createFileRoute("/entrar")({
  component: EntrarRoute,
  loader: async () => loadGateSession(),
  pendingComponent: GatePending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function EntrarRoute() {
  const session = Route.useLoaderData();

  return <AccountGate session={session} />;
}

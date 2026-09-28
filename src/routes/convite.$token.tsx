import { createFileRoute } from "@tanstack/react-router";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";
import { loadGateSession } from "@/features/auth/gate";
import { LoadingState } from "@/features/budget/components/empty-state";

function InvitePending() {
  return <LoadingState>Carregando convite…</LoadingState>;
}

export const Route = createFileRoute("/convite/$token")({
  component: InviteRoute,
  loader: async () => loadGateSession(),
  pendingComponent: InvitePending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function InviteRoute() {
  const session = Route.useLoaderData();
  const { token } = Route.useParams();
  return <AccountGate session={session} invite={token} />;
}

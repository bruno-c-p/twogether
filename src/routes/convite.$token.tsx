import { createFileRoute } from "@tanstack/react-router";
import { loadGateSession } from "@/features/auth";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";
import { LoadingState } from "@/components/ui/empty-state";

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

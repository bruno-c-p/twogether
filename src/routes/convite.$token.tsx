import { createFileRoute } from "@tanstack/react-router";
import { loadGateSession } from "@/features/auth";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";

function InvitePending() {
  return (
    <div
      aria-live="polite"
      className="grid min-h-75 place-items-center type-body text-text-2"
    >
      Carregando convite…
    </div>
  );
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

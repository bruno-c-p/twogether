import { createFileRoute } from "@tanstack/react-router";
import { loadGateSession } from "@/features/auth";
import { AccountGate } from "@/features/auth/components/account-gate/account-gate";

function GatePending() {
  return (
    <div
      aria-live="polite"
      className="grid min-h-75 place-items-center type-body text-text-2"
    >
      Carregando…
    </div>
  );
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

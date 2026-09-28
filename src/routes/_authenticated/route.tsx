import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadSession } from "@/features/auth/actions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const legacyInvite = new URLSearchParams(location.searchStr).get("convite");

    if (legacyInvite)
      throw redirect({
        to: "/convite/$token",
        params: { token: legacyInvite },
        replace: true,
      });
    const session = await loadSession();

    if (!session.user?.name || !session.householdId)
      throw redirect({ to: "/entrar" });
  },
  component: Outlet,
});

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadSession } from "@/features/auth/actions";
import { isWorkspaceReady, legacyInviteToken } from "@/features/auth/gate";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const legacyInvite = legacyInviteToken(location.searchStr);

    if (legacyInvite)
      throw redirect({
        to: "/convite/$token",
        params: { token: legacyInvite },
        replace: true,
      });

    if (!isWorkspaceReady(await loadSession()))
      throw redirect({ to: "/entrar" });
  },
  component: Outlet,
});

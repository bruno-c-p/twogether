import { redirect } from "@tanstack/react-router";
import { loadSession } from "@/features/auth/actions";
import type { SessionState } from "@/features/auth/actions/load-session";

function leaveWorkspace() {
  window.location.assign("/entrar");
}

// A session can use the workspace once it has a name and a household.
export function isWorkspaceReady(session: SessionState) {
  return Boolean(session.user?.name && session.householdId);
}

// Old invite links used /?convite=<token>; they now live at /convite/<token>.
export function legacyInviteToken(searchStr: string) {
  return new URLSearchParams(searchStr).get("convite");
}

export async function loadGateSession() {
  const session = await loadSession();

  if (isWorkspaceReady(session)) throw redirect({ to: "/" });

  return session;
}

// beforeLoad runs on every page click and is not cached. Once the budget is
// already on screen, the session check must not hold the next page.
export async function guardWorkspace(
  searchStr: string,
  hasWorkspace: boolean,
  load: () => Promise<SessionState> = loadSession,
  leave: () => void = leaveWorkspace,
) {
  const legacyInvite = legacyInviteToken(searchStr);

  if (legacyInvite) {
    throw redirect({
      to: "/convite/$token",
      params: { token: legacyInvite },
      replace: true,
    });
  }

  if (hasWorkspace) {
    void load()
      .then((session) => {
        if (!isWorkspaceReady(session)) leave();
      })
      .catch(() => undefined);

    return;
  }

  const session = await load();

  // Signed out: the landing page. Signed in but not set up yet: onboarding.
  if (!isWorkspaceReady(session)) {
    throw redirect({ to: session.user ? "/entrar" : "/conheca" });
  }
}

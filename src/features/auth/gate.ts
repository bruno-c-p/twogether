import { redirect } from "@tanstack/react-router";
import { loadSession } from "@/features/auth/actions";
import type { SessionState } from "@/features/auth/actions/load-session";

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

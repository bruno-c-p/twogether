import { redirect } from "@tanstack/react-router";
import { loadSession } from "@/features/auth/actions";

export async function loadGateSession() {
  const session = await loadSession();

  if (session.user?.name && session.householdId) throw redirect({ to: "/" });

  return session;
}

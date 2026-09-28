import { createServerFn } from "@tanstack/react-start";
import { optionalAuthMiddleware } from "@/server/middleware";

export interface SessionState {
  user: { id: string; name: string } | null;
  householdId: string | null;
}

export const loadSession = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(({ context }): SessionState => ({
    user: context.user
      ? { id: context.user.id, name: context.user.name }
      : null,
    householdId: context.user?.household_id ?? null,
  }));

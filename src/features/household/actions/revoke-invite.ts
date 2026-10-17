import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { householdMiddleware } from "@/server/middleware";

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) => getStore().revokeInvite(context.householdId));

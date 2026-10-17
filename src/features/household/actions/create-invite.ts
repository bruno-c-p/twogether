import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { householdMiddleware } from "@/server/middleware";

export const createInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) => getStore().createInvite(context.householdId));

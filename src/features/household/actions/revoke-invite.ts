import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { householdMiddleware } from "@/server/middleware";

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) =>
    getBudgetStore().revokeInvite(context.householdId),
  );

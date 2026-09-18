import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) =>
    runMutation(() =>
      getBudgetStore().revokeInvite(context.user, context.household),
    ),
  );

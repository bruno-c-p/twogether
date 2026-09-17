import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import {
  getBudgetStore,
  sessionToken,
  throwHttpError,
} from "@/features/budget/actions/budget-store.server";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getBudgetStore().sessionUser(sessionToken());
    if (!user) throw redirect({ to: "/entrar" });
    return next({ context: { user } });
  },
);

export const householdMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    try {
      // ponytail: null until step 6 splits create/join/profile off mutateBudget.
      const household = await getBudgetStore().householdFor(context.user);
      return next({ context: { household } });
    } catch (error) {
      throwHttpError(error);
    }
  });

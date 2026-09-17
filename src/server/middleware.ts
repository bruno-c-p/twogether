import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import {
  getBudgetStore,
  sessionToken,
  throwHttpError,
} from "@/features/budget/actions/budget-store.server";
import { RequestError } from "@/features/budget/services/shared.server";

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
      const household = await getBudgetStore().householdFor(context.user);
      if (!household)
        throw new RequestError("Crie um orçamento ou aceite um convite.");
      return next({ context: { household } });
    } catch (error) {
      throwHttpError(error);
    }
  });

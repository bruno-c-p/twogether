import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { currentUser } from "@/features/auth/current-user.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import { RequestError, throwHttpError } from "@/server/request-error";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await currentUser();
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

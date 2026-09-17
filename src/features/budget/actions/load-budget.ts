import { createServerFn } from "@tanstack/react-start";
import {
  getBudgetStore,
  sessionToken,
  throwHttpError,
} from "@/features/budget/actions/budget-store.server";
import { parseBudgetCommand } from "@/features/budget/command";
import { householdMiddleware } from "@/server/middleware";

export const loadBudget = createServerFn({ method: "GET" }).handler(() => {
  return getBudgetStore().snapshot(sessionToken());
});

export const mutateBudget = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseBudgetCommand)
  .handler(async ({ data, context }) => {
    try {
      return await getBudgetStore().command(
        data,
        context.user,
        context.household,
      );
    } catch (error) {
      throwHttpError(error);
    }
  });

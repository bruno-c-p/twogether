import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  goalPercentagesSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const savePercentagesSchema = inputSchema({
  percentages: goalPercentagesSchema,
  revision: revisionSchema,
});

export const parseSavePercentages = actionInput<{
  percentages: GoalPercentages;
  revision: number;
}>(savePercentagesSchema);

export const savePercentages = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSavePercentages)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().savePercentages(context.user, context.household, data),
    ),
  );

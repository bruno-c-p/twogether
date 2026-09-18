import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { isGoalPercentages } from "@/features/budget/domain/validate";
import { runMutation } from "@/server/request-error";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { invalid, revision } from "@/features/budget/actions/parse";

export function parseSavePercentages(input: unknown): {
  percentages: GoalPercentages;
  revision: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isGoalPercentages(data.percentages)) invalid();
  return {
    percentages: data.percentages,
    revision: revision(data.revision),
  };
}

export const savePercentages = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSavePercentages)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().savePercentages(context.user, context.household, data),
    ),
  );

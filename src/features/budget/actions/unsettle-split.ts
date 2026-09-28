import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { idSchema, revisionSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const unsettleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export function parseUnsettleSplit(input: unknown): {
  id: string;
  revision: number;
} {
  return parseInput(unsettleSplitSchema, input);
}

export const unsettleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseUnsettleSplit)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().unsettleSplit(context.user, context.household, data),
    ),
  );

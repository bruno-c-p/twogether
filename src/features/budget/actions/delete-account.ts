import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { idSchema, revisionSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const deleteAccountSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export function parseDeleteAccount(input: unknown): {
  id: string;
  revision: number;
} {
  return parseInput(deleteAccountSchema, input);
}

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteAccount)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteAccount(context.user, context.household, data),
    ),
  );

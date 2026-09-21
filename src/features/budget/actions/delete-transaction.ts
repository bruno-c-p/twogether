import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  followingSchema,
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const deleteTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  following: followingSchema.optional(),
});

export function parseDeleteTransaction(input: unknown): {
  id: string;
  revision: number;
  following?: { id: string; revision: number }[];
} {
  return parseInput(deleteTransactionSchema, input);
}

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteTransaction(context.user, context.household, data),
    ),
  );

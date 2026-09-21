import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  occurrencesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import type { Transaction } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const saveTransactionSchema = inputSchema({
  transaction: transactionSchema,
  occurrences: occurrencesSchema.optional(),
});

export function parseSaveTransaction(input: unknown): {
  transaction: Transaction;
  occurrences?: number;
} {
  return parseInput(saveTransactionSchema, input);
}

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().saveTransaction(context.user, context.household, data),
    ),
  );

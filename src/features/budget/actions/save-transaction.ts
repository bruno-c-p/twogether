import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  occurrencesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type { Transaction } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const saveTransactionSchema = inputSchema({
  transaction: transactionSchema,
  occurrences: occurrencesSchema.optional(),
});

export const parseSaveTransaction = actionInput<{
  transaction: Transaction;
  occurrences?: number;
}>(saveTransactionSchema);

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveTransaction)
  .handler(async ({ data, context }) =>
    getBudgetStore().saveTransaction(context.user, context.householdId, data),
  );

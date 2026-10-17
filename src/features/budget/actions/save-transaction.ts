import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { getStore } from "@/server/store.server";
import {
  occurrencesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const saveTransactionSchema = inputSchema({
  transaction: transactionSchema,
  occurrences: occurrencesSchema.optional(),
});

export type SaveTransactionInput = z.infer<typeof saveTransactionSchema>;

export const parseSaveTransaction = actionInput(saveTransactionSchema);

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveTransaction)
  .handler(async ({ data, context }) =>
    getStore().saveTransaction(context.user, context.householdId, data),
  );

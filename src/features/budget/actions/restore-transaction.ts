import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const restoreTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export function parseRestoreTransaction(input: unknown): {
  id: string;
  revision: number;
} {
  return parseInput(restoreTransactionSchema, input);
}

export const restoreTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseRestoreTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().restoreTransaction(
        context.user,
        context.household,
        data,
      ),
    ),
  );

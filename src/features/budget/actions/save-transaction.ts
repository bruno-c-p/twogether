import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { isTransaction } from "@/features/budget/domain/validate";
import { runMutation } from "@/server/request-error";
import type { Transaction } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { invalid } from "@/features/budget/actions/parse";

export function parseSaveTransaction(input: unknown): {
  transaction: Transaction;
  occurrences?: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isTransaction(data.transaction)) invalid();
  if (data.occurrences === undefined) return { transaction: data.transaction };
  if (
    typeof data.occurrences !== "number" ||
    !Number.isInteger(data.occurrences) ||
    data.occurrences < 1 ||
    data.occurrences > 120
  )
    invalid();
  return { transaction: data.transaction, occurrences: data.occurrences };
}

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().saveTransaction(context.user, context.household, data),
    ),
  );

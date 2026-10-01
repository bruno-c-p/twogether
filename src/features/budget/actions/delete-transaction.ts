import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  followingSchema,
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const deleteTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  following: followingSchema.optional(),
});

export const parseDeleteTransaction = actionInput<{
  id: string;
  revision: number;
  following?: { id: string; revision: number }[];
}>(deleteTransactionSchema);

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteTransaction(
        context.user,
        context.householdId,
        data,
      ),
    ),
  );

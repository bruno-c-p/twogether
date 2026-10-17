import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import {
  followingSchema,
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
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
    getStore().deleteTransaction(context.user, context.householdId, data),
  );

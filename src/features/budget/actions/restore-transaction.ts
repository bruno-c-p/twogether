import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { idSchema, revisionSchema } from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const restoreTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export const parseRestoreTransaction = actionInput<{
  id: string;
  revision: number;
}>(restoreTransactionSchema);

export const restoreTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseRestoreTransaction)
  .handler(async ({ data, context }) =>
    getStore().restoreTransaction(context.user, context.householdId, data),
  );

import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
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

export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

export const parseDeleteTransaction = actionInput(deleteTransactionSchema);

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteTransaction)
  .handler(async ({ data, context }) =>
    getStore().deleteTransaction(context.user, context.householdId, data),
  );

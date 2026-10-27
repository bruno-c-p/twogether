import { z } from "zod/mini";
import {
  dateSchema,
  followingSchema,
  goalPercentagesSchema,
  idSchema,
  occurrencesSchema,
  revisionSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import {
  optimisticDelete,
  optimisticRestore,
  optimisticSave,
  optimisticSettle,
  optimisticUnsettle,
} from "@/features/budget/optimistic";
import { inputSchema } from "@/server/action-input";
import {
  mutations,
  type ExtraOf,
  type InputOf,
  type ServerActions,
} from "@/server/mutation";
import type { Store } from "@/server/store.server";

const { define } = mutations<Store, WorkspaceSnapshot>();

const saveTransactionSchema = inputSchema({
  transaction: transactionSchema,
  occurrences: z.optional(occurrencesSchema),
});

export type SaveTransactionInput = z.infer<typeof saveTransactionSchema>;

const deleteTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  following: z.optional(followingSchema),
});

export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

const restoreTransactionSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export type RestoreTransactionInput = z.infer<typeof restoreTransactionSchema>;

const settleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  date: dateSchema,
});

export type SettleSplitInput = z.infer<typeof settleSplitSchema>;

const unsettleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export type UnsettleSplitInput = z.infer<typeof unsettleSplitSchema>;

const savePercentagesSchema = inputSchema({
  percentages: goalPercentagesSchema,
  revision: revisionSchema,
});

export type SavePercentagesInput = z.infer<typeof savePercentagesSchema>;

export const budgetMutations = {
  saveTransaction: define("saveTransaction", {
    gate: "household",
    schema: saveTransactionSchema,
    run: (store, actor, input) =>
      store.saveTransaction(actor.user, actor.householdId, input),
    optimistic: optimisticSave,
  }),
  deleteTransaction: define("deleteTransaction", {
    gate: "household",
    schema: deleteTransactionSchema,
    run: (store, actor, input) =>
      store.deleteTransaction(actor.user, actor.householdId, input),
    optimistic: optimisticDelete,
  }),
  restoreTransaction: define("restoreTransaction", {
    gate: "household",
    schema: restoreTransactionSchema,
    run: (store, actor, input) =>
      store.restoreTransaction(actor.user, actor.householdId, input),
    optimistic: optimisticRestore,
  }),
  settleSplit: define("settleSplit", {
    gate: "household",
    schema: settleSplitSchema,
    run: (store, actor, input) =>
      store.settleSplit(actor.user, actor.householdId, input),
    optimistic: optimisticSettle,
  }),
  unsettleSplit: define("unsettleSplit", {
    gate: "household",
    schema: unsettleSplitSchema,
    run: (store, actor, input) =>
      store.unsettleSplit(actor.user, actor.householdId, input),
    optimistic: optimisticUnsettle,
  }),
  savePercentages: define("savePercentages", {
    gate: "household",
    schema: savePercentagesSchema,
    run: (store, actor, input) => store.savePercentages(actor.user, input),
  }),
};

type Registry = typeof budgetMutations;

export type BudgetMutationName = keyof Registry;

export type BudgetInput<K extends BudgetMutationName> = InputOf<Registry[K]>;

export type BudgetExtra<K extends BudgetMutationName> = ExtraOf<Registry[K]>;

export type BudgetActions = ServerActions<Registry>;

import { createServerFn } from "@tanstack/react-start";
import {
  budgetMutations as defs,
  type BudgetActions,
} from "@/features/budget/actions/mutations";
import { householdMiddleware } from "@/server/middleware";
import { serve } from "@/server/serve.server";

export { loadWorkspace } from "@/features/budget/actions/load-workspace";

// The Start compiler only extracts a top-level `const x = createServerFn()`,
// so each mutation stays its own statement.

const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.saveTransaction.parse)
  .handler(serve(defs.saveTransaction));

const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.deleteTransaction.parse)
  .handler(serve(defs.deleteTransaction));

const restoreTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.restoreTransaction.parse)
  .handler(serve(defs.restoreTransaction));

const settleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.settleSplit.parse)
  .handler(serve(defs.settleSplit));

const unsettleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.unsettleSplit.parse)
  .handler(serve(defs.unsettleSplit));

const savePercentages = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.savePercentages.parse)
  .handler(serve(defs.savePercentages));

export const budgetActions = {
  saveTransaction,
  deleteTransaction,
  restoreTransaction,
  settleSplit,
  unsettleSplit,
  savePercentages,
} satisfies BudgetActions;

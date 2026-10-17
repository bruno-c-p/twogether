import { useQueryStates } from "nuqs";
import type { Transaction } from "@/features/budget/domain/types";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { dialogParams, NEW_TRANSACTION } from "@/features/budget/search";

// The open dialog lives in the URL, so a reload keeps it open. Opening or
// closing one clears the errors of the mutations it shows, so a failure
// from an earlier attempt never greets the next one.
export function useWorkspaceDialogs(
  mutations: BudgetMutations,
  transactions: Transaction[],
) {
  const [open, setOpen] = useQueryStates(dialogParams);

  const find = (id: string | null) =>
    id === null ? null : (transactions.find((item) => item.id === id) ?? null);

  function transactionDialog() {
    if (open.transaction === NEW_TRANSACTION) return { transaction: null };

    const transaction = find(open.transaction);

    return transaction ? { transaction } : null;
  }

  function update(next: Partial<typeof open>, reset: { reset: () => void }) {
    reset.reset();
    void setOpen(next);
  }

  return {
    transaction: transactionDialog(),
    setTransaction: (next: { transaction: Transaction | null } | null) =>
      update(
        {
          transaction: next ? (next.transaction?.id ?? NEW_TRANSACTION) : null,
        },
        mutations.saveTransaction,
      ),
    percentagesRevision: open.percentages,
    setPercentagesRevision: (revision: number | null) =>
      update({ percentages: revision }, mutations.savePercentages),
    deleting: find(open.delete),
    setDeleting: (transaction: Transaction | null) =>
      update({ delete: transaction?.id ?? null }, mutations.deleteTransaction),
    settling: find(open.settle),
    setSettling: (transaction: Transaction | null) =>
      update({ settle: transaction?.id ?? null }, mutations.settleSplit),
  };
}

export type WorkspaceDialogs = ReturnType<typeof useWorkspaceDialogs>;

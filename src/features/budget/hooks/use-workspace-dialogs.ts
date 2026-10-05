import { useState } from "react";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";

// Opening or closing a dialog clears the errors of the mutations it shows,
// so a failure from an earlier attempt never greets the next one.
function useDialogState<Value>(
  initial: Value,
  mutations: { reset: () => void }[],
) {
  const [value, setValue] = useState<Value>(initial);

  function set(next: Value) {
    for (const mutation of mutations) mutation.reset();
    setValue(next);
  }

  return [value, set] as const;
}

export function useWorkspaceDialogs(mutations: BudgetMutations) {
  const [transaction, setTransaction] = useDialogState<{
    transaction: Transaction | null;
  } | null>(null, [mutations.saveTx]);

  const [account, setAccount] = useDialogState<{
    account: BankAccount | null;
  } | null>(null, [mutations.saveAcc]);

  const [percentagesRevision, setPercentagesRevision] = useDialogState<
    number | null
  >(null, [mutations.savePct]);

  const [deleting, setDeleting] = useDialogState<Transaction | null>(null, [
    mutations.deleteTx,
  ]);

  const [settling, setSettling] = useDialogState<Transaction | null>(null, [
    mutations.settleTx,
  ]);

  return {
    transaction,
    setTransaction,
    account,
    setAccount,
    percentagesRevision,
    setPercentagesRevision,
    deleting,
    setDeleting,
    settling,
    setSettling,
  };
}

export type WorkspaceDialogs = ReturnType<typeof useWorkspaceDialogs>;

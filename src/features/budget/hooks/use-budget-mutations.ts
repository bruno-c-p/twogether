import {
  deleteTransaction,
  restoreTransaction,
  savePercentages,
  saveTransaction,
  settleSplit,
  unsettleSplit,
} from "@/features/budget/actions";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import {
  optimisticDelete,
  optimisticRestore,
  optimisticSave,
  optimisticSettle,
  optimisticUnsettle,
} from "@/features/budget/workspace";
import type { DeleteTransactionInput } from "@/features/budget/actions/delete-transaction";
import type { RestoreTransactionInput } from "@/features/budget/actions/restore-transaction";
import type { SavePercentagesInput } from "@/features/budget/actions/save-percentages";
import type { SaveTransactionInput } from "@/features/budget/actions/save-transaction";
import type { SettleSplitInput } from "@/features/budget/actions/settle-split";
import type { UnsettleSplitInput } from "@/features/budget/actions/unsettle-split";
import type { Transaction } from "@/features/budget/domain/types";

export function useBudgetMutations() {
  const saveTx = useMutation(
    (data: SaveTransactionInput) => saveTransaction({ data }),
    optimisticSave,
  );

  const deleteTx = useMutation(
    (data: DeleteTransactionInput) => deleteTransaction({ data }),
    optimisticDelete,
  );

  const restoreTx = useMutation(
    (data: RestoreTransactionInput & { transaction: Transaction }) =>
      restoreTransaction({ data: { id: data.id, revision: data.revision } }),
    (snapshot, data) => optimisticRestore(snapshot, data.transaction),
  );

  const savePct = useMutation((data: SavePercentagesInput) =>
    savePercentages({ data }),
  );

  const settleTx = useMutation(
    (data: SettleSplitInput) => settleSplit({ data }),
    optimisticSettle,
  );

  const unsettleTx = useMutation(
    (data: UnsettleSplitInput) => unsettleSplit({ data }),
    optimisticUnsettle,
  );

  const all = [saveTx, deleteTx, restoreTx, savePct, settleTx, unsettleTx];

  return {
    saveTx,
    deleteTx,
    restoreTx,
    savePct,
    settleTx,
    unsettleTx,
    splitBusy: settleTx.pending || unsettleTx.pending,
    busy: all.some((mutation) => mutation.pending),
  };
}

export type BudgetMutations = ReturnType<typeof useBudgetMutations>;

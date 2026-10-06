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
import type { SettleInput } from "@/features/budget/components/settle-dialog";
import type {
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";

export function useBudgetMutations() {
  const saveTx = useMutation(
    (data: { transaction: Transaction; occurrences?: number }) =>
      saveTransaction({ data }),
    optimisticSave,
  );

  const deleteTx = useMutation(
    (data: {
      id: string;
      revision: number;
      following?: { id: string; revision: number }[];
    }) => deleteTransaction({ data }),
    optimisticDelete,
  );

  const restoreTx = useMutation(
    (data: { id: string; revision: number; transaction: Transaction }) =>
      restoreTransaction({ data: { id: data.id, revision: data.revision } }),
    (snapshot, data) => optimisticRestore(snapshot, data.transaction),
  );

  const savePct = useMutation(
    (data: { percentages: GoalPercentages; revision: number }) =>
      savePercentages({ data }),
  );

  const settleTx = useMutation(
    (data: SettleInput & { id: string; revision: number }) =>
      settleSplit({ data }),
    optimisticSettle,
  );

  const unsettleTx = useMutation(
    (data: { id: string; revision: number }) => unsettleSplit({ data }),
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

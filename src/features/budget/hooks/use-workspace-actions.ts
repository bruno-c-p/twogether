import { toastManager } from "@/components/ui/toast-manager";
import type {
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import type { WorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import type { SettleInput } from "@/features/budget/components/settle-dialog";

function savedMessage(isUpdate: boolean, occurrences: number) {
  if (isUpdate) return "Transação atualizada.";

  if (occurrences > 1) return `${occurrences} transações mensais adicionadas.`;

  return "Transação adicionada.";
}

function versioned(record: { id: string; revision?: number }) {
  return { id: record.id, revision: record.revision ?? 0 };
}

// Each save closes its own dialog when it succeeds and leaves it open with
// the mutation's error when it fails; dialogs read `pending` for busy state.
export function useWorkspaceActions({
  budget,
  dialogs,
  mutations,
  setMonth,
}: {
  budget: BudgetController;
  dialogs: WorkspaceDialogs;
  mutations: BudgetMutations;
  setMonth: (month: string) => void;
}) {
  const {
    saveTransaction,
    deleteTransaction,
    restoreTransaction,
    savePercentages,
    settleSplit,
    unsettleSplit,
  } = mutations;

  async function save(transaction: Transaction, occurrences = 1) {
    const isUpdate = Boolean(dialogs.transaction?.transaction);

    if (!(await saveTransaction.run({ transaction, occurrences }))) return;

    dialogs.setTransaction(null);
    setMonth(transaction.date.slice(0, 7));
    toastManager.add({
      title: savedMessage(isUpdate, occurrences),
      type: "success",
    });
  }

  async function remove(transaction: Transaction) {
    if (transaction.recurrenceId) {
      dialogs.setDeleting(transaction);

      return;
    }

    if (!(await deleteTransaction.run(versioned(transaction)))) return;

    notifyDeleted(transaction);
  }

  function notifyDeleted(transaction: Transaction) {
    const id = toastManager.add({
      title: "Transação excluída.",
      type: "success",
      timeout: 0,
      actionProps: {
        children: "Desfazer",
        onClick: (event) => {
          event.preventDefault();
          void restoreDeleted(transaction, id);
        },
      },
    });
  }

  async function restoreDeleted(transaction: Transaction, id: string) {
    const restored = await restoreTransaction.run(
      { id: transaction.id, revision: (transaction.revision ?? 0) + 1 },
      { transaction },
    );

    if (!restored) return;

    toastManager.close(id);
    toastManager.add({ title: "Alteração desfeita.", type: "success" });
  }

  function openTransaction(transaction: Transaction | null) {
    dialogs.setTransaction({ transaction });
  }

  function openPercentages() {
    const own = budget.household.members.find(
      (member) => member.id === budget.user.id,
    );

    dialogs.setPercentagesRevision(own?.percentagesRevision ?? 0);
  }

  function openSettle(transaction: Transaction) {
    dialogs.setTransaction(null);
    dialogs.setSettling(transaction);
  }

  async function confirmSettle(input: SettleInput) {
    const source = dialogs.settling;

    if (!source) return;

    if (!(await settleSplit.run({ ...input, ...versioned(source) }))) return;

    dialogs.setSettling(null);

    const id = toastManager.add({
      title: "Pagamento registrado.",
      type: "success",
      timeout: 0,
      actionProps: {
        children: "Desfazer",
        onClick: (event) => {
          event.preventDefault();
          void unsettle(
            { ...source, revision: (source.revision ?? 0) + 1 },
            id,
          );
        },
      },
    });
  }

  // Closes the transaction dialog it may have been started from.
  async function unsettle(transaction: Transaction, toastId?: string) {
    if (!(await unsettleSplit.run(versioned(transaction)))) return;

    dialogs.setTransaction(null);

    if (toastId !== undefined) toastManager.close(toastId);

    toastManager.add({ title: "Pagamento desmarcado.", type: "success" });
  }

  async function saveGoalPercentages(values: GoalPercentages) {
    const revision = dialogs.percentagesRevision;

    if (revision === null) return;

    if (!(await savePercentages.run({ percentages: values, revision }))) return;

    dialogs.setPercentagesRevision(null);
    toastManager.add({ title: "Percentuais atualizados.", type: "success" });
  }

  // `following` lists the later occurrences to delete too; empty deletes
  // only this one and offers undo.
  async function deleteRecurring(
    transaction: Transaction,
    following: Transaction[],
  ) {
    const deleted = await deleteTransaction.run({
      ...versioned(transaction),
      following: following.length ? following.map(versioned) : undefined,
    });

    if (!deleted) return;

    const count = following.length + 1;

    if (following.length)
      toastManager.add({
        title: `${count} transações excluídas.`,
        type: "success",
      });
    else notifyDeleted(transaction);
    dialogs.setDeleting(null);
  }

  return {
    save,
    remove,
    openTransaction,
    openPercentages,
    saveGoalPercentages,
    deleteRecurring,
    openSettle,
    confirmSettle,
    unsettle,
  };
}

export type WorkspaceActions = ReturnType<typeof useWorkspaceActions>;

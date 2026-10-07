import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
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
  const posthog = usePostHog();

  const { saveTx, deleteTx, restoreTx, savePct, settleTx, unsettleTx } =
    mutations;

  async function save(transaction: Transaction, occurrences = 1) {
    const isUpdate = Boolean(dialogs.transaction?.transaction);

    if (!(await saveTx.run({ transaction, occurrences }))) return;

    posthog.capture(isUpdate ? "transaction_updated" : "transaction_created", {
      transaction_kind: transaction.kind,
      has_goal: Boolean(transaction.goal),
      is_recurring: occurrences > 1,
      occurrence_count: occurrences,
    });
    dialogs.setTransaction(null);
    setMonth(transaction.date.slice(0, 7));
    toast.success(savedMessage(isUpdate, occurrences));
  }

  async function remove(transaction: Transaction) {
    if (transaction.recurrenceId) {
      dialogs.setDeleting(transaction);

      return;
    }

    if (!(await deleteTx.run(versioned(transaction)))) return;

    posthog.capture("transaction_deleted", { delete_scope: "single" });
    notifyDeleted(transaction);
  }

  function notifyDeleted(transaction: Transaction) {
    const id = toast.success("Transação excluída.", {
      duration: Infinity,
      action: {
        label: "Desfazer",
        onClick: (event) => {
          event.preventDefault();
          void restoreDeleted(transaction, id);
        },
      },
    });
  }

  async function restoreDeleted(transaction: Transaction, id: string | number) {
    const restored = await restoreTx.run({
      id: transaction.id,
      revision: (transaction.revision ?? 0) + 1,
      transaction,
    });

    if (!restored) return;

    toast.dismiss(id);
    toast.success("Alteração desfeita.");
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

    if (!(await settleTx.run({ ...input, ...versioned(source) }))) return;

    posthog.capture("split_settled");
    dialogs.setSettling(null);

    const id = toast.success("Pagamento registrado.", {
      duration: Infinity,
      action: {
        label: "Desfazer",
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
  async function unsettle(transaction: Transaction, toastId?: string | number) {
    if (!(await unsettleTx.run(versioned(transaction)))) return;

    posthog.capture("split_unsettled");
    dialogs.setTransaction(null);

    if (toastId !== undefined) toast.dismiss(toastId);

    toast.success("Pagamento desmarcado.");
  }

  async function saveGoalPercentages(values: GoalPercentages) {
    const revision = dialogs.percentagesRevision;

    if (revision === null) return;

    if (!(await savePct.run({ percentages: values, revision }))) return;

    posthog.capture("goal_percentages_saved");
    dialogs.setPercentagesRevision(null);
    toast.success("Percentuais atualizados.");
  }

  // `following` lists the later occurrences to delete too; empty deletes
  // only this one and offers undo.
  async function deleteRecurring(
    transaction: Transaction,
    following: Transaction[],
  ) {
    const deleted = await deleteTx.run({
      ...versioned(transaction),
      following: following.length ? following.map(versioned) : undefined,
    });

    if (!deleted) return;

    const count = following.length + 1;

    posthog.capture("transaction_deleted", {
      delete_scope: following.length ? "following" : "single",
      deleted_count: count,
    });

    if (following.length) toast.success(`${count} transações excluídas.`);
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

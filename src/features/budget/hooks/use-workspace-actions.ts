import { usePostHog } from "posthog-js/react";
import type { Notice } from "@/features/budget/components/notice";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
  View,
} from "@/features/budget/domain/types";
import type { PhraseDraft } from "@/features/budget/domain/phrase";
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

export function useWorkspaceActions({
  budget,
  dialogs,
  mutations,
  following,
  notice,
  setNotice,
  setMonth,
  openView,
}: {
  budget: BudgetController;
  dialogs: WorkspaceDialogs;
  mutations: BudgetMutations;
  following: Transaction[];
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
  setMonth: (month: string) => void;
  openView: (view: View) => void;
}) {
  const posthog = usePostHog();

  const {
    saveTx,
    deleteTx,
    restoreTx,
    saveAcc,
    deleteAcc,
    savePct,
    settleTx,
    unsettleTx,
  } = mutations;

  async function save(transaction: Transaction, occurrences = 1) {
    const isUpdate = Boolean(dialogs.transaction?.transaction);

    if (!(await saveTx.run({ transaction, occurrences }))) return false;

    posthog.capture(isUpdate ? "transaction_updated" : "transaction_created", {
      transaction_kind: transaction.kind,
      has_goal: Boolean(transaction.goal),
      is_recurring: occurrences > 1,
      occurrence_count: occurrences,
    });
    setMonth(transaction.date.slice(0, 7));
    setNotice({ message: savedMessage(isUpdate, occurrences) });

    return true;
  }

  async function remove(transaction: Transaction) {
    if (transaction.recurrenceId) {
      dialogs.setDeleting(transaction);

      return;
    }

    if (!(await deleteTx.run(versioned(transaction)))) return;

    posthog.capture("transaction_deleted", { delete_scope: "single" });
    setNotice({ message: "Transação excluída.", undo: transaction });
  }

  function openTransaction(
    transaction: Transaction | null,
    draft?: PhraseDraft,
  ) {
    if (!transaction && budget.state.accounts.length === 0) {
      setNotice({ message: "Cadastre uma conta para lançar transações." });
      openView("accounts");

      return;
    }

    dialogs.setRegister(false);
    dialogs.setTransaction({ transaction, draft });
  }

  function openRegister() {
    if (budget.state.accounts.length === 0) {
      openTransaction(null);

      return;
    }

    dialogs.setRegister(true);
  }

  async function saveAccountRecord(account: BankAccount) {
    const isUpdate = Boolean(dialogs.account?.account);

    if (!(await saveAcc.run(account))) return false;

    posthog.capture(isUpdate ? "account_updated" : "account_created");
    setNotice({
      message: isUpdate ? "Conta atualizada." : "Conta adicionada.",
    });

    return true;
  }

  async function removeAccount(account: BankAccount) {
    if (!(await deleteAcc.run(versioned(account)))) return;

    posthog.capture("account_deleted");
    setNotice({ message: "Conta excluída." });
  }

  function openSettle(transaction: Transaction) {
    dialogs.setTransaction(null);
    dialogs.setSettling(transaction);
  }

  async function confirmSettle(input: SettleInput) {
    const source = dialogs.settling;

    if (!source) return false;

    const settled = await settleTx.run({ ...input, ...versioned(source) });

    if (!settled) return false;

    posthog.capture("split_settled");
    setNotice({
      message: "Pagamento registrado.",
      undoSettle: { ...source, revision: (source.revision ?? 0) + 1 },
    });

    return true;
  }

  async function unsettle(transaction: Transaction) {
    if (!(await unsettleTx.run(versioned(transaction)))) return false;

    posthog.capture("split_unsettled");
    setNotice({ message: "Pagamento desmarcado." });

    return true;
  }

  async function undoNotice() {
    if (notice?.undoSettle) {
      await unsettle(notice.undoSettle);

      return;
    }

    const undo = notice?.undo;

    if (!undo) return;

    const restored = await restoreTx.run({
      id: undo.id,
      revision: (undo.revision ?? 0) + 1,
      transaction: undo,
    });

    if (restored) setNotice({ message: "Alteração desfeita." });
  }

  async function saveGoalPercentages(values: GoalPercentages) {
    const revision = dialogs.percentagesRevision;

    if (revision === null) return false;

    if (!(await savePct.run({ percentages: values, revision }))) return false;

    posthog.capture("goal_percentages_saved");
    setNotice({ message: "Percentuais atualizados." });

    return true;
  }

  async function deleteRecurring(includeFollowing: boolean) {
    const deleting = dialogs.deleting;

    if (!deleting) return;

    const deleted = await deleteTx.run({
      ...versioned(deleting),
      following: includeFollowing ? following.map(versioned) : undefined,
    });

    if (!deleted) return;

    const count = includeFollowing ? following.length + 1 : 1;

    posthog.capture("transaction_deleted", {
      delete_scope: includeFollowing ? "following" : "single",
      deleted_count: count,
    });
    setNotice(
      includeFollowing
        ? { message: `${count} transações excluídas.` }
        : { message: "Transação excluída.", undo: deleting },
    );
    dialogs.setDeleting(null);
  }

  return {
    save,
    remove,
    openTransaction,
    openRegister,
    saveAccountRecord,
    removeAccount,
    undoNotice,
    saveGoalPercentages,
    deleteRecurring,
    openSettle,
    confirmSettle,
    unsettle,
  };
}

export type WorkspaceActions = ReturnType<typeof useWorkspaceActions>;

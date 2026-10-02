import { useNavigate } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import type { Notice } from "@/features/budget/components/notice";
import { WORKSPACE_PATHS } from "@/features/budget/constants";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
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

// Each save closes its own dialog when it succeeds and leaves it open with
// the mutation's error when it fails; dialogs read `pending` for busy state.
export function useWorkspaceActions({
  budget,
  dialogs,
  mutations,
  notice,
  setNotice,
  setMonth,
}: {
  budget: BudgetController;
  dialogs: WorkspaceDialogs;
  mutations: BudgetMutations;
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
  setMonth: (month: string) => void;
}) {
  const posthog = usePostHog();
  const navigate = useNavigate();

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

    if (!(await saveTx.run({ transaction, occurrences }))) return;

    posthog.capture(isUpdate ? "transaction_updated" : "transaction_created", {
      transaction_kind: transaction.kind,
      has_goal: Boolean(transaction.goal),
      is_recurring: occurrences > 1,
      occurrence_count: occurrences,
    });
    dialogs.setTransaction(null);
    setMonth(transaction.date.slice(0, 7));
    setNotice({ message: savedMessage(isUpdate, occurrences) });
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
      void navigate({ to: WORKSPACE_PATHS.accounts });

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

  function openPercentages() {
    const own = budget.household.members.find(
      (member) => member.id === budget.user.id,
    );

    dialogs.setPercentagesRevision(own?.percentagesRevision ?? 0);
  }

  async function saveAccountRecord(account: BankAccount) {
    const isUpdate = Boolean(dialogs.account?.account);

    if (!(await saveAcc.run(account))) return;

    posthog.capture(isUpdate ? "account_updated" : "account_created");
    dialogs.setAccount(null);
    setNotice({
      message: isUpdate ? "Conta atualizada." : "Conta adicionada.",
    });
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

    if (!source) return;

    if (!(await settleTx.run({ ...input, ...versioned(source) }))) return;

    posthog.capture("split_settled");
    dialogs.setSettling(null);
    setNotice({
      message: "Pagamento registrado.",
      undoSettle: { ...source, revision: (source.revision ?? 0) + 1 },
    });
  }

  // Closes the transaction dialog it may have been started from.
  async function unsettle(transaction: Transaction) {
    if (!(await unsettleTx.run(versioned(transaction)))) return;

    posthog.capture("split_unsettled");
    dialogs.setTransaction(null);
    setNotice({ message: "Pagamento desmarcado." });
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

    if (revision === null) return;

    if (!(await savePct.run({ percentages: values, revision }))) return;

    posthog.capture("goal_percentages_saved");
    dialogs.setPercentagesRevision(null);
    setNotice({ message: "Percentuais atualizados." });
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
    setNotice(
      following.length
        ? { message: `${count} transações excluídas.` }
        : { message: "Transação excluída.", undo: transaction },
    );
    dialogs.setDeleting(null);
  }

  return {
    save,
    remove,
    openTransaction,
    openRegister,
    openPercentages,
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

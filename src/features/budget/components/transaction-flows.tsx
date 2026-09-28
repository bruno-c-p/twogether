import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import { SettleDialog } from "@/features/budget/components/settle-dialog";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import type { WorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import type { WorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { localDate, currentMonth } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";

type FlowProps = {
  budget: BudgetController;
  dialogs: WorkspaceDialogs;
  mutations: BudgetMutations;
  actions: WorkspaceActions;
};

function transactionDefaultDate(month: string) {
  return month === currentMonth() ? localDate() : `${month}-01`;
}

function EditorDialogs({
  budget,
  dialogs,
  mutations,
  actions,
  month,
  allTags,
}: FlowProps & { month: string; allTags: string[] }) {
  return (
    <>
      {dialogs.percentagesRevision !== null && (
        <GoalPercentagesDialog
          percentages={budget.state.percentages}
          onClose={() => dialogs.setPercentagesRevision(null)}
          error={mutations.savePct.error}
          onSave={actions.saveGoalPercentages}
        />
      )}
      {dialogs.transaction && (
        <TransactionDialog
          transaction={dialogs.transaction.transaction}
          defaultDate={transactionDefaultDate(month)}
          existingTags={allTags}
          members={budget.household.members}
          accounts={budget.state.accounts}
          currentUserId={budget.user.id}
          serverError={mutations.saveTx.error}
          splitBusy={mutations.splitBusy}
          onSave={actions.save}
          onSettle={actions.openSettle}
          onUnsettle={actions.unsettle}
          onClose={() => dialogs.setTransaction(null)}
        />
      )}
      {dialogs.account && (
        <AccountDialog
          account={dialogs.account.account}
          serverError={mutations.saveAcc.error}
          onSave={actions.saveAccountRecord}
          onClose={() => dialogs.setAccount(null)}
        />
      )}
    </>
  );
}

export function TransactionFlows({
  month,
  allTags,
  following,
  ...flow
}: FlowProps & { month: string; allTags: string[]; following: Transaction[] }) {
  const { budget, dialogs, mutations, actions } = flow;

  return (
    <>
      <EditorDialogs {...flow} month={month} allTags={allTags} />
      {dialogs.deleting && (
        <DeleteRecurrenceDialog
          transaction={dialogs.deleting}
          count={following.length + 1}
          busy={mutations.deleteTx.pending}
          error={mutations.deleteTx.error}
          onClose={() => dialogs.setDeleting(null)}
          onDelete={actions.deleteRecurring}
        />
      )}
      {dialogs.settling && (
        <SettleDialog
          transaction={dialogs.settling}
          members={budget.household.members}
          accounts={budget.state.accounts}
          serverError={mutations.settleTx.error}
          onConfirm={actions.confirmSettle}
          onClose={() => dialogs.setSettling(null)}
        />
      )}
    </>
  );
}

import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import { SettleDialog } from "@/features/budget/components/settle-dialog";
import { RegisterSheet } from "@/features/budget/components/register-sheet";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { localDate, currentMonth } from "@/features/budget/domain/format";
import { laterOccurrences } from "@/features/budget/domain/recurrence";
import type { Transaction } from "@/features/budget/domain/types";

function transactionDefaultDate(month: string) {
  return month === currentMonth() ? localDate() : `${month}-01`;
}

function DeleteRecurrenceFlow({ transaction }: { transaction: Transaction }) {
  const { budget, dialogs, mutations, actions } = useWorkspace();
  const following = laterOccurrences(budget.state.transactions, transaction);

  return (
    <DeleteRecurrenceDialog
      transaction={transaction}
      count={following.length + 1}
      busy={mutations.deleteTx.pending}
      error={mutations.deleteTx.error}
      onClose={() => dialogs.setDeleting(null)}
      onDelete={(all) =>
        actions.deleteRecurring(transaction, all ? following : [])
      }
    />
  );
}

export function TransactionFlows() {
  const { budget, data, month, dialogs, mutations, actions } = useWorkspace();

  return (
    <>
      {dialogs.percentagesRevision !== null && (
        <GoalPercentagesDialog
          percentages={budget.state.percentages}
          busy={mutations.savePct.pending}
          error={mutations.savePct.error}
          onSave={actions.saveGoalPercentages}
          onClose={() => dialogs.setPercentagesRevision(null)}
        />
      )}
      {dialogs.transaction && (
        <TransactionDialog
          transaction={dialogs.transaction.transaction}
          draft={dialogs.transaction.draft}
          defaultDate={transactionDefaultDate(month)}
          existingTags={data.allTags}
          members={budget.household.members}
          accounts={budget.state.accounts}
          currentUserId={budget.user.id}
          busy={mutations.saveTx.pending}
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
          busy={mutations.saveAcc.pending}
          serverError={mutations.saveAcc.error}
          onSave={actions.saveAccountRecord}
          onClose={() => dialogs.setAccount(null)}
        />
      )}
      {dialogs.register && (
        <RegisterSheet
          accounts={budget.state.accounts}
          onParsed={(draft) => actions.openTransaction(null, draft)}
          onManual={() => actions.openTransaction(null)}
          onClose={() => dialogs.setRegister(false)}
        />
      )}
      {dialogs.deleting && (
        <DeleteRecurrenceFlow transaction={dialogs.deleting} />
      )}
      {dialogs.settling && (
        <SettleDialog
          transaction={dialogs.settling}
          members={budget.household.members}
          accounts={budget.state.accounts}
          busy={mutations.settleTx.pending}
          serverError={mutations.settleTx.error}
          onConfirm={actions.confirmSettle}
          onClose={() => dialogs.setSettling(null)}
        />
      )}
    </>
  );
}

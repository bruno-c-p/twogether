import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import { SettleDialog } from "@/features/budget/components/settle-dialog";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { laterInSeries } from "@/features/budget/domain/recurrence";
import type { Transaction } from "@/features/budget/domain/types";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";

function transactionDefaultDate(month: string) {
  const date = today(browserTimeZone());

  return date.startsWith(month) ? date : `${month}-01`;
}

function DeleteRecurrenceFlow({ transaction }: { transaction: Transaction }) {
  const { budget, dialogs, mutations, actions } = useWorkspace();
  const following = laterInSeries(budget.state.transactions, transaction);

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
  const { budget, month, dialogs, mutations, actions } = useWorkspace();

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
          defaultDate={transactionDefaultDate(month)}
          members={budget.household.members}
          currentUserId={budget.user.id}
          busy={mutations.saveTx.pending}
          serverError={mutations.saveTx.error}
          splitBusy={mutations.splitBusy}
          onSave={actions.save}
          onSettle={actions.openSettle}
          onUnsettle={actions.unsettle}
          onDelete={(transaction) => {
            dialogs.setTransaction(null);
            void actions.remove(transaction);
          }}
          onClose={() => dialogs.setTransaction(null)}
        />
      )}
      {dialogs.deleting && (
        <DeleteRecurrenceFlow transaction={dialogs.deleting} />
      )}
      {dialogs.settling && (
        <SettleDialog
          transaction={dialogs.settling}
          members={budget.household.members}
          busy={mutations.settleTx.pending}
          serverError={mutations.settleTx.error}
          onConfirm={actions.confirmSettle}
          onClose={() => dialogs.setSettling(null)}
        />
      )}
    </>
  );
}

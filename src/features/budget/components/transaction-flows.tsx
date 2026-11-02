import { lazy, Suspense } from "react";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { laterInSeries } from "@/features/budget/domain/recurrence";
import type { Transaction } from "@/features/budget/domain/types";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";
import { useBrowserSync } from "@/lib/use-browser-sync";

// Dialogs open only on a tap, so their code (forms, pickers, validation)
// stays off the first load and downloads once the page is interactive.
const loaders = {
  deleteRecurrence: () =>
    import("@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog").then(
      ({ DeleteRecurrenceDialog }) => ({ default: DeleteRecurrenceDialog }),
    ),
  goalPercentages: () =>
    import("@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog").then(
      ({ GoalPercentagesDialog }) => ({ default: GoalPercentagesDialog }),
    ),
  transaction: () =>
    import("@/features/budget/components/transaction-dialog/transaction-dialog").then(
      ({ TransactionDialog }) => ({ default: TransactionDialog }),
    ),
  settle: () =>
    import("@/features/budget/components/settle-dialog").then(
      ({ SettleDialog }) => ({ default: SettleDialog }),
    ),
};

const DeleteRecurrenceDialog = lazy(loaders.deleteRecurrence);

const GoalPercentagesDialog = lazy(loaders.goalPercentages);

const TransactionDialog = lazy(loaders.transaction);

const SettleDialog = lazy(loaders.settle);

function transactionDefaultDate(month: string) {
  const date = today(browserTimeZone());

  return date.startsWith(month) ? date : `${month}-01`;
}

function DeleteRecurrenceFlow({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const { budget, dialogs, mutations, actions } = useWorkspace();

  const following = transaction
    ? laterInSeries(budget.state.transactions, transaction)
    : [];

  return (
    <DeleteRecurrenceDialog
      open={transaction !== null}
      transaction={transaction}
      count={following.length + 1}
      busy={mutations.deleteTransaction.pending}
      error={mutations.deleteTransaction.error}
      onClose={() => dialogs.setDeleting(null)}
      onDelete={(all) =>
        transaction
          ? actions.deleteRecurring(transaction, all ? following : [])
          : Promise.resolve()
      }
    />
  );
}

export function TransactionFlows() {
  const { budget, month, dialogs, mutations, actions } = useWorkspace();

  useBrowserSync(["workspace-dialogs"], () => {
    for (const load of Object.values(loaders))
      void load().catch(() => undefined);
  });

  return (
    <Suspense>
      <GoalPercentagesDialog
        open={dialogs.percentagesRevision !== null}
        percentages={budget.state.percentages}
        busy={mutations.savePercentages.pending}
        error={mutations.savePercentages.error}
        onSave={actions.saveGoalPercentages}
        onClose={() => dialogs.setPercentagesRevision(null)}
      />
      <TransactionDialog
        open={dialogs.transaction !== null}
        transaction={dialogs.transaction?.transaction ?? null}
        defaultDate={transactionDefaultDate(month)}
        members={budget.household.members}
        currentUserId={budget.user.id}
        busy={mutations.saveTransaction.pending}
        serverError={mutations.saveTransaction.error}
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
      <DeleteRecurrenceFlow transaction={dialogs.deleting} />
      <SettleDialog
        open={dialogs.settling !== null}
        transaction={dialogs.settling}
        members={budget.household.members}
        busy={mutations.settleSplit.pending}
        serverError={mutations.settleSplit.error}
        onConfirm={actions.confirmSettle}
        onClose={() => dialogs.setSettling(null)}
      />
    </Suspense>
  );
}

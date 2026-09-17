import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import { CoupleDialog } from "@/features/budget/components/couple-dialog";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { localDate } from "@/features/budget/services/budget";
import type { BankAccount, Transaction } from "@/features/budget/types";
import type { Notice } from "@/features/budget/components/notice";

export function TransactionFlows({
  budget,
  month,
  allTags,
  dialog,
  accountDialog,
  deleting,
  following,
  editingPercentages,
  coupleOpen,
  onSave,
  onSaveAccount,
  onCloseDialog,
  onCloseAccount,
  onCloseDeleting,
  onClosePercentages,
  onCloseCouple,
  onNotice,
}: {
  budget: BudgetController;
  month: string;
  allTags: string[];
  dialog: { transaction: Transaction | null } | null;
  accountDialog: { account: BankAccount | null } | null;
  deleting: Transaction | null;
  following: Transaction[];
  editingPercentages: number | null;
  coupleOpen: boolean;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onSaveAccount: (account: BankAccount) => Promise<boolean>;
  onCloseDialog: () => void;
  onCloseAccount: () => void;
  onCloseDeleting: () => void;
  onClosePercentages: () => void;
  onCloseCouple: () => void;
  onNotice: (notice: Notice) => void;
}) {
  return (
    <>
      {editingPercentages !== null && (
        <GoalPercentagesDialog
          percentages={budget.state.percentages}
          onClose={onClosePercentages}
          error={budget.error}
          onSave={async (values) => {
            if (!(await budget.savePercentages(values, editingPercentages)))
              return false;
            onNotice({ message: "Percentuais atualizados." });
            return true;
          }}
        />
      )}
      {dialog && (
        <TransactionDialog
          transaction={dialog.transaction}
          defaultDate={
            month === localDate().slice(0, 7) ? localDate() : `${month}-01`
          }
          existingTags={allTags}
          members={budget.household?.members ?? []}
          accounts={budget.state.accounts}
          currentUserId={budget.user?.id ?? ""}
          serverError={budget.error}
          onSave={onSave}
          onClose={onCloseDialog}
        />
      )}
      {accountDialog && (
        <AccountDialog
          account={accountDialog.account}
          serverError={budget.error}
          onSave={onSaveAccount}
          onClose={onCloseAccount}
        />
      )}
      {deleting && (
        <DeleteRecurrenceDialog
          transaction={deleting}
          count={following.length + 1}
          busy={budget.busy}
          error={budget.error}
          onClose={onCloseDeleting}
          onDelete={async (includeFollowing) => {
            if (
              await budget.removeTransaction(
                deleting,
                includeFollowing ? following : undefined,
              )
            ) {
              onNotice(
                includeFollowing
                  ? { message: `${following.length + 1} transações excluídas.` }
                  : { message: "Transação excluída.", undo: deleting },
              );
              onCloseDeleting();
            }
          }}
        />
      )}
      {coupleOpen && <CoupleDialog budget={budget} onClose={onCloseCouple} />}
    </>
  );
}

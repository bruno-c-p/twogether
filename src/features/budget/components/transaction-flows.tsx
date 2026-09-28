import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import {
  SettleDialog,
  type SettleInput,
} from "@/features/budget/components/settle-dialog";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import { CoupleDialog } from "@/features/household/components/couple-dialog/couple-dialog";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { localDate, currentMonth } from "@/features/budget/domain/format";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";

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
  saveError,
  accountError,
  deleteError,
  percentagesError,
  deleteBusy,
  settling,
  settleError,
  splitBusy,
  onSettle,
  onConfirmSettle,
  onUnsettle,
  onCloseSettle,
  onSave,
  onSaveAccount,
  onSavePercentages,
  onDelete,
  onCloseDialog,
  onCloseAccount,
  onCloseDeleting,
  onClosePercentages,
  onCloseCouple,
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
  saveError: string;
  accountError: string;
  deleteError: string;
  percentagesError: string;
  deleteBusy: boolean;
  settling: Transaction | null;
  settleError: string;
  splitBusy: boolean;
  onSettle: (transaction: Transaction) => void;
  onConfirmSettle: (input: SettleInput) => Promise<boolean>;
  onUnsettle: (transaction: Transaction) => Promise<boolean>;
  onCloseSettle: () => void;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onSaveAccount: (account: BankAccount) => Promise<boolean>;
  onSavePercentages: (values: GoalPercentages) => Promise<boolean>;
  onDelete: (includeFollowing: boolean) => Promise<void>;
  onCloseDialog: () => void;
  onCloseAccount: () => void;
  onCloseDeleting: () => void;
  onClosePercentages: () => void;
  onCloseCouple: () => void;
}) {
  return (
    <>
      {editingPercentages !== null && (
        <GoalPercentagesDialog
          percentages={budget.state.percentages}
          onClose={onClosePercentages}
          error={percentagesError}
          onSave={onSavePercentages}
        />
      )}
      {dialog && (
        <TransactionDialog
          transaction={dialog.transaction}
          defaultDate={month === currentMonth() ? localDate() : `${month}-01`}
          existingTags={allTags}
          members={budget.household.members}
          accounts={budget.state.accounts}
          currentUserId={budget.user.id}
          serverError={saveError}
          splitBusy={splitBusy}
          onSave={onSave}
          onSettle={onSettle}
          onUnsettle={onUnsettle}
          onClose={onCloseDialog}
        />
      )}
      {accountDialog && (
        <AccountDialog
          account={accountDialog.account}
          serverError={accountError}
          onSave={onSaveAccount}
          onClose={onCloseAccount}
        />
      )}
      {deleting && (
        <DeleteRecurrenceDialog
          transaction={deleting}
          count={following.length + 1}
          busy={deleteBusy}
          error={deleteError}
          onClose={onCloseDeleting}
          onDelete={onDelete}
        />
      )}
      {settling && (
        <SettleDialog
          transaction={settling}
          members={budget.household.members}
          accounts={budget.state.accounts}
          serverError={settleError}
          onConfirm={onConfirmSettle}
          onClose={onCloseSettle}
        />
      )}
      {coupleOpen && <CoupleDialog budget={budget} onClose={onCloseCouple} />}
    </>
  );
}

import {
  isRepayment,
  transactionStatus,
} from "@/features/budget/domain/status";
import type { Transaction } from "@/features/budget/domain/types";
import { halfDown, minusCents, sumCents } from "@/lib/decimal";

export const partnerShare = halfDown;

export function usTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => !isRepayment(transaction));
}

// Splits dated after `today` (e.g. upcoming recurrences) are not owed yet.
function unpaidSplits(
  transactions: Transaction[],
  userId: string,
  today: string,
) {
  return transactions.filter((transaction) => {
    const status = transactionStatus(transaction, userId);

    return status.split && !status.paidAt && transaction.date <= today;
  });
}

/**
 * Positive: the partner owes `userId`; negative: `userId` owes the partner.
 * `today` is a YYYY-MM-DD date; only splits up to it count.
 */
export function splitDebt(
  transactions: Transaction[],
  userId: string,
  today: string,
) {
  const unpaid = unpaidSplits(transactions, userId, today).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const shares = (paidByUser: boolean) =>
    sumCents(
      unpaid
        .filter(
          (transaction) =>
            transactionStatus(transaction, userId).userOwes !== paidByUser,
        )
        .map((transaction) => partnerShare(transaction.amount)),
    );

  const net = minusCents(shares(true), shares(false));

  return { net, unpaid };
}

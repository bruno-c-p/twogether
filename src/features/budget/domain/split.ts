import type { Transaction } from "@/features/budget/domain/types";
import { halfDown, minusCents, sumCents } from "@/lib/decimal";

export const partnerShare = halfDown;

const isRepayment = (transaction: Transaction) =>
  Boolean(transaction.settlementOf);

export function usTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => !isRepayment(transaction));
}

// Splits dated after `today` (e.g. upcoming recurrences) are not owed yet.
function unpaidSplits(transactions: Transaction[], today: string) {
  return transactions.filter(
    (transaction) =>
      transaction.kind === "expense" &&
      transaction.split &&
      !transaction.split.paidAt &&
      !isRepayment(transaction) &&
      transaction.date <= today,
  );
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
  const unpaid = unpaidSplits(transactions, today).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const shares = (paidByUser: boolean) =>
    sumCents(
      unpaid
        .filter(
          (transaction) => (transaction.memberId === userId) === paidByUser,
        )
        .map((transaction) => partnerShare(transaction.amount)),
    );

  const net = minusCents(shares(true), shares(false));

  return { net, unpaid };
}

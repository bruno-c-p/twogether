import Big from "big.js";
import type { Transaction } from "@/features/budget/domain/types";
import { sum } from "@/lib/decimal";

export const partnerShare = (amount: number) =>
  new Big(amount).div(2).round(0, Big.roundDown).toNumber();

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

  const net = sum(
    unpaid.map((transaction) => {
      const share = partnerShare(transaction.amount);

      return transaction.memberId === userId ? share : -share;
    }),
  );

  return { net, unpaid };
}

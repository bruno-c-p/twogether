import type { Transaction } from "@/features/budget/domain/types";

export const partnerShare = (amount: number) => Math.floor(amount / 2);

export const isRepayment = (transaction: Transaction) =>
  Boolean(transaction.settlementOf);

export const isPaidSplit = (transaction: Transaction) =>
  Boolean(transaction.split?.paidAt);

export function usTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => !isRepayment(transaction));
}

export function unpaidSplits(transactions: Transaction[]) {
  return transactions.filter(
    (transaction) =>
      transaction.kind === "expense" &&
      transaction.split &&
      !transaction.split.paidAt &&
      !isRepayment(transaction),
  );
}

/** Positive: the partner owes `userId`; negative: `userId` owes the partner. */
export function splitDebt(transactions: Transaction[], userId: string) {
  const unpaid = unpaidSplits(transactions).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const net = unpaid.reduce(
    (sum, transaction) =>
      sum +
      (transaction.memberId === userId ? 1 : -1) *
        partnerShare(transaction.amount),
    0,
  );

  return { net, unpaid };
}

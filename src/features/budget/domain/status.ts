import type { Transaction } from "@/features/budget/domain/types";

export type TransactionLock = "repayment" | "paid";

export function isRepayment(t: Transaction) {
  return Boolean(t.settlementOf);
}

export function isRepaymentOf(t: Transaction, sourceId: string) {
  return t.settlementOf === sourceId;
}

export function transactionStatus(t: Transaction, userId: string) {
  const repayment = isRepayment(t);
  const split = !repayment && t.kind === "expense" && Boolean(t.split);
  const paidAt = split ? t.split?.paidAt : undefined;

  const lock: TransactionLock | undefined = repayment
    ? "repayment"
    : paidAt
      ? "paid"
      : undefined;

  return {
    repayment,
    split,
    paidAt,
    userOwes: split && t.memberId !== userId,
    lock,
  };
}

export type TransactionStatus = ReturnType<typeof transactionStatus>;

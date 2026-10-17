import type { Transaction } from "@/features/budget/domain/types";

// The stored row keeps its recurrence and authorship; a new recurring
// transaction starts a series at index 0.
export function firstOccurrence({
  transaction,
  previous,
  recurring,
  userId,
  newId,
}: {
  transaction: Transaction;
  previous: Transaction | undefined;
  recurring: boolean;
  userId: string;
  newId: () => string;
}): Transaction {
  return {
    ...transaction,
    recurrenceId: previous?.recurrenceId ?? (recurring ? newId() : undefined),
    recurrenceIndex: previous?.recurrenceIndex ?? (recurring ? 0 : undefined),
    memberId: previous?.memberId ?? previous?.createdBy ?? userId,
    createdBy: previous?.createdBy ?? userId,
  };
}

export function clampedMonthsAfter(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));

  if (target.getUTCFullYear() > 9999) return undefined;

  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));

  return target.toISOString().slice(0, 10);
}

export function laterInSeries(
  transactions: Transaction[],
  transaction: Transaction,
) {
  const index = transaction.recurrenceIndex;

  if (!transaction.recurrenceId || index === undefined) return [];

  return transactions.filter(
    (item) =>
      item.recurrenceId === transaction.recurrenceId &&
      item.recurrenceIndex !== undefined &&
      item.recurrenceIndex > index,
  );
}

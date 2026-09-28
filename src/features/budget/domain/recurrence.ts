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

import { GOALS } from "@/features/budget/constants";
import { usTransactions } from "@/features/budget/domain/split";
import type {
  TransactionLock,
  TransactionStatus,
} from "@/features/budget/domain/status";
import type { Transaction } from "@/features/budget/domain/types";

// Without a member, the couple's shared view ("Nós"): repayments between the
// two net out. With one, that person's own transactions.
export function transactionsFor(
  transactions: Transaction[],
  memberId: string | undefined,
) {
  if (!memberId) return usTransactions(transactions);

  return transactions.filter((t) => t.memberId === memberId);
}

export function matchesQuery(transaction: Transaction, query: string) {
  const goal = GOALS.find((g) => g.id === transaction.goal)?.name ?? "";

  return `${transaction.description} ${goal}`
    .toLocaleLowerCase("pt-BR")
    .includes(query.toLocaleLowerCase("pt-BR"));
}

// Split expenses are a filter of their own, not a stored kind.
export function matchesKind(
  transaction: Transaction,
  kind: Transaction["kind"] | "split",
) {
  if (kind === "split") return Boolean(transaction.split);

  return transaction.kind === kind;
}

const REPAYMENT_LOCK = "reembolso: desmarque o pagamento na transação original";

// Repayments are edited through the original split; a paid split must be
// unmarked before it can be deleted.
const DELETE_LOCKS = {
  repayment: REPAYMENT_LOCK,
  paid: "desmarque o pagamento antes",
} satisfies Record<TransactionLock, string>;

export function deleteLock(status: TransactionStatus) {
  return status.lock ? DELETE_LOCKS[status.lock] : "";
}

export function editLock(status: TransactionStatus) {
  return status.repayment ? REPAYMENT_LOCK : "";
}

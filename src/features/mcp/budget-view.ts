import { GOALS } from "@/features/budget/constants";
import {
  memberTotals,
  planGoals,
  summarize,
} from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { goalProgress } from "@/features/budget/domain/goal-progress";
import {
  partnerShare,
  splitDebt,
  usTransactions,
} from "@/features/budget/domain/split";
import type {
  GoalId,
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import { RequestError } from "@/server/request-error";

export interface TransactionFilters {
  month: string;
  member?: string;
  kind?: "expense" | "income" | "split";
  goal?: GoalId;
  tag?: string;
  query?: string;
  recurrence?: string;
}

const goalName = (id: GoalId | null) =>
  GOALS.find((goal) => goal.id === id)?.name ?? null;

const amount = (cents: number) => ({ cents, formatted: money(cents) });

function memberName(snapshot: WorkspaceSnapshot, id: string | undefined) {
  return snapshot.household.members.find((member) => member.id === id)?.name;
}

function assertMember(snapshot: WorkspaceSnapshot, member: string | undefined) {
  if (member && !memberName(snapshot, member))
    throw new RequestError(
      "Pessoa não encontrada. Use um id de members em get_overview.",
    );
}

// Without a member, the couple's shared view: repayments between the two net
// out. With one, that person's own transactions, as the app's filters do.
function viewFor(snapshot: WorkspaceSnapshot, member: string | undefined) {
  const { transactions } = snapshot.budget;

  if (!member) return usTransactions(transactions);

  return transactions.filter((t) => t.memberId === member);
}

function monthly(
  snapshot: WorkspaceSnapshot,
  month: string,
  member: string | undefined,
) {
  assertMember(snapshot, member);

  return viewFor(snapshot, member).filter((t) => t.date.startsWith(month));
}

function searchableText(transaction: Transaction) {
  return `${transaction.description} ${transaction.tags.join(" ")} ${goalName(transaction.goal) ?? ""}`.toLocaleLowerCase(
    "pt-BR",
  );
}

function matches(transaction: Transaction, filters: TransactionFilters) {
  const query = filters.query?.trim().toLocaleLowerCase("pt-BR");

  if (query && !searchableText(transaction).includes(query)) return false;

  if (filters.goal && transaction.goal !== filters.goal) return false;

  if (filters.tag && !transaction.tags.includes(filters.tag)) return false;

  if (filters.kind === "split") return Boolean(transaction.split);

  return !filters.kind || transaction.kind === filters.kind;
}

export function describeTransaction(
  snapshot: WorkspaceSnapshot,
  transaction: Transaction,
) {
  const { split } = transaction;

  return {
    id: transaction.id,
    revision: transaction.revision,
    date: transaction.date,
    description: transaction.description,
    kind: transaction.kind,
    amount: amount(transaction.amount),
    goal: transaction.goal,
    goalName: goalName(transaction.goal),
    tags: transaction.tags,
    memberId: transaction.memberId,
    memberName: memberName(snapshot, transaction.memberId),
    split: split && {
      partnerShare: amount(partnerShare(transaction.amount)),
      paid: Boolean(split.paidAt),
      paidAt: split.paidAt,
    },
    repaymentOf: transaction.settlementOf,
    recurrence: transaction.recurrenceId && {
      id: transaction.recurrenceId,
      index: transaction.recurrenceIndex,
    },
  };
}

function listed(snapshot: WorkspaceSnapshot, filters: TransactionFilters) {
  if (!filters.recurrence)
    return monthly(snapshot, filters.month, filters.member);

  assertMember(snapshot, filters.member);

  return viewFor(snapshot, filters.member).filter(
    (t) => t.recurrenceId === filters.recurrence,
  );
}

export function listTransactions(
  snapshot: WorkspaceSnapshot,
  filters: TransactionFilters,
) {
  const rows = listed(snapshot, filters)
    .filter((t) => matches(t, filters))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    month: filters.recurrence ? undefined : filters.month,
    recurrence: filters.recurrence,
    count: rows.length,
    transactions: rows.map((t) => describeTransaction(snapshot, t)),
  };
}

function splitBalance(snapshot: WorkspaceSnapshot) {
  const { net, unpaid } = splitDebt(
    snapshot.budget.transactions,
    snapshot.user.id,
  );

  const partner = snapshot.household.members.find(
    (member) => member.id !== snapshot.user.id,
  );

  return {
    net: amount(net),
    meaning:
      net === 0
        ? "Ninguém deve nada."
        : net > 0
          ? `${partner?.name ?? "A outra pessoa"} deve para você.`
          : `Você deve para ${partner?.name ?? "a outra pessoa"}.`,
    unpaid: unpaid.map((t) => ({
      ...describeTransaction(snapshot, t),
      owedByYou: t.memberId !== snapshot.user.id,
    })),
  };
}

export function overview(
  snapshot: WorkspaceSnapshot,
  month: string,
  member: string | undefined,
) {
  const rows = monthly(snapshot, month, member);
  const { members } = snapshot.household;
  const summary = summarize(rows);

  const plans = planGoals(
    rows,
    members.filter((item) => !member || item.id === member),
  );

  return {
    month,
    view: member ? memberName(snapshot, member) : "Nós",
    you: snapshot.user,
    members: members.map((item) => ({ id: item.id, name: item.name })),
    income: amount(summary.income),
    expenses: amount(summary.expenses),
    balance: amount(summary.balance),
    goals: summary.goals.map((goal, index) => {
      const planned = plans[index].planned;
      const progress = goalProgress(goal.amount, planned);

      return {
        id: goal.id,
        name: goal.name,
        percentage: plans[index].percentage,
        planned: amount(planned),
        spent: amount(goal.amount),
        remaining: amount(progress.remaining),
        over: amount(progress.over),
        count: goal.count,
      };
    }),
    partners:
      !member && members.length === 2
        ? memberTotals(
            rows,
            members.map((item) => item.id),
          ).map((totals, position) => ({
            memberId: totals.memberId,
            name: members[position].name,
            income: amount(totals.income),
            expenses: amount(totals.expenses),
          }))
        : undefined,
    splitBalance: splitBalance(snapshot),
    tags: [
      ...new Set(snapshot.budget.transactions.flatMap((t) => t.tags)),
    ].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function goalPercentages(snapshot: WorkspaceSnapshot) {
  return {
    goals: GOALS.map((goal) => ({
      id: goal.id,
      name: goal.name,
      description: goal.description,
    })),
    members: snapshot.household.members.map((member) => ({
      id: member.id,
      name: member.name,
      editable: member.id === snapshot.user.id,
      percentages: member.percentages,
      revision: member.percentagesRevision,
    })),
  };
}

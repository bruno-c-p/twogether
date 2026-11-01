import { GOALS } from "@/features/budget/constants";
import type { Transaction, MemberBudget } from "@/features/budget/domain/types";
import {
  minusCents,
  percentageOf,
  percentOf,
  sumCents,
  ZERO_CENTS,
} from "@/lib/decimal";

const total = (
  transactions: Transaction[],
  include: (transaction: Transaction) => boolean,
) => sumCents(transactions.flatMap((t) => (include(t) ? [t.amount] : [])));

/** What a transaction adds to its day's net. A transfer moves money without spending it. */
export function signedFlow(t: Transaction) {
  switch (t.kind) {
    case "income":
      return t.amount;
    case "expense":
      return minusCents(ZERO_CENTS, t.amount);
    case "transfer":
      return ZERO_CENTS;
    default:
      return t.kind satisfies never;
  }
}

export function summarize(transactions: Transaction[]) {
  const income = total(transactions, (t) => t.kind === "income");

  const expenses = total(transactions, (t) => t.kind === "expense");

  const goals = GOALS.map((goal) => ({
    ...goal,
    amount: total(
      transactions,
      (t) => t.kind !== "income" && t.goal === goal.id,
    ),
    count: transactions.filter((t) => t.kind !== "income" && t.goal === goal.id)
      .length,
  }));

  return {
    income,
    expenses,
    balance: minusCents(income, expenses),
    goals,
  };
}

/** Each member's own income and expenses, in the order of `memberIds`. */
export function memberTotals(transactions: Transaction[], memberIds: string[]) {
  return memberIds.map((memberId) => {
    const own = transactions.filter((t) => t.memberId === memberId);

    return {
      memberId,
      income: total(own, (t) => t.kind === "income"),
      expenses: total(own, (t) => t.kind === "expense"),
    };
  });
}

export function planGoals(
  transactions: Transaction[],
  members: MemberBudget[],
) {
  const incomes = members.map((member) => ({
    member,
    income: total(
      transactions,
      (transaction) =>
        transaction.kind === "income" && transaction.memberId === member.id,
    ),
  }));

  const income = sumCents(incomes.map((item) => item.income));

  return GOALS.map((goal) => {
    const shares = incomes.map((item) => ({
      memberId: item.member.id,
      planned: percentageOf(item.income, item.member.percentages[goal.id]),
      percentage: item.member.percentages[goal.id],
    }));

    const planned = sumCents(shares.map((share) => share.planned));

    return {
      id: goal.id,
      planned,
      shares,
      percentage:
        members.length === 1
          ? members[0].percentages[goal.id]
          : income > 0
            ? percentOf(planned, income)
            : null,
    };
  });
}

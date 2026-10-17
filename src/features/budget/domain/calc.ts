import { GOALS } from "@/features/budget/constants";
import type { Transaction, MemberBudget } from "@/features/budget/domain/types";
import { minusCents, percentageOf, percentOf, sumCents } from "@/lib/decimal";

const total = (
  transactions: Transaction[],
  include: (transaction: Transaction) => boolean,
) => sumCents(transactions.flatMap((t) => (include(t) ? [t.amount] : [])));

export function summarize(transactions: Transaction[]) {
  const income = total(transactions, (t) => t.kind === "income");

  const expenses = total(transactions, (t) => t.kind === "expense");

  const goals = GOALS.map((goal) => ({
    ...goal,
    amount: total(
      transactions,
      (t) => t.kind === "expense" && t.goal === goal.id,
    ),
    count: transactions.filter(
      (t) => t.kind === "expense" && t.goal === goal.id,
    ).length,
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

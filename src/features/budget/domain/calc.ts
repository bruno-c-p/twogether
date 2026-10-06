import { GOALS } from "@/features/budget/constants";
import type { Transaction, MemberBudget } from "@/features/budget/domain/types";

export function summarize(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.kind === "income")
    .reduce((total, t) => total + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.kind === "expense")
    .reduce((total, t) => total + t.amount, 0);

  const goals = GOALS.map((goal) => ({
    ...goal,
    amount: transactions
      .filter((t) => t.kind === "expense" && t.goal === goal.id)
      .reduce((total, t) => total + t.amount, 0),
    count: transactions.filter(
      (t) => t.kind === "expense" && t.goal === goal.id,
    ).length,
  }));

  return { income, expenses, balance: income - expenses, goals };
}

/** Each member's own income and expenses, in the order of `memberIds`. */
export function memberTotals(transactions: Transaction[], memberIds: string[]) {
  return memberIds.map((memberId) => {
    const own = transactions.filter((t) => t.memberId === memberId);

    return {
      memberId,
      income: own
        .filter((t) => t.kind === "income")
        .reduce((total, t) => total + t.amount, 0),
      expenses: own
        .filter((t) => t.kind === "expense")
        .reduce((total, t) => total + t.amount, 0),
    };
  });
}

export function planGoals(
  transactions: Transaction[],
  members: MemberBudget[],
) {
  const incomes = members.map((member) => ({
    member,
    income: transactions.reduce(
      (sum, transaction) =>
        sum +
        (transaction.kind === "income" && transaction.memberId === member.id
          ? transaction.amount
          : 0),
      0,
    ),
  }));

  const income = incomes.reduce((sum, item) => sum + item.income, 0);

  return GOALS.map((goal) => {
    const shares = incomes.map((item) => ({
      memberId: item.member.id,
      planned: Math.round(
        (item.income * item.member.percentages[goal.id]) / 100,
      ),
      percentage: item.member.percentages[goal.id],
    }));

    const planned = shares.reduce((sum, share) => sum + share.planned, 0);

    return {
      id: goal.id,
      planned,
      shares,
      percentage:
        members.length === 1
          ? members[0].percentages[goal.id]
          : income > 0
            ? (planned / income) * 100
            : null,
    };
  });
}

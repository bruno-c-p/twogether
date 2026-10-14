import Big from "big.js";
import { GOALS } from "@/features/budget/constants";
import type { Transaction, MemberBudget } from "@/features/budget/domain/types";
import { percentOf, sum } from "@/lib/decimal";

export function summarize(transactions: Transaction[]) {
  const income = sum(
    transactions.map((t) => (t.kind === "income" ? t.amount : 0)),
  );

  const expenses = sum(
    transactions.map((t) => (t.kind === "expense" ? t.amount : 0)),
  );

  const goals = GOALS.map((goal) => ({
    ...goal,
    amount: sum(
      transactions.map((t) =>
        t.kind === "expense" && t.goal === goal.id ? t.amount : 0,
      ),
    ),
    count: transactions.filter(
      (t) => t.kind === "expense" && t.goal === goal.id,
    ).length,
  }));

  return {
    income,
    expenses,
    balance: new Big(income).minus(expenses).toNumber(),
    goals,
  };
}

/** Each member's own income and expenses, in the order of `memberIds`. */
export function memberTotals(transactions: Transaction[], memberIds: string[]) {
  return memberIds.map((memberId) => {
    const own = transactions.filter((t) => t.memberId === memberId);

    return {
      memberId,
      income: sum(own.map((t) => (t.kind === "income" ? t.amount : 0))),
      expenses: sum(own.map((t) => (t.kind === "expense" ? t.amount : 0))),
    };
  });
}

export function planGoals(
  transactions: Transaction[],
  members: MemberBudget[],
) {
  const incomes = members.map((member) => ({
    member,
    income: sum(
      transactions.map((transaction) =>
        transaction.kind === "income" && transaction.memberId === member.id
          ? transaction.amount
          : 0,
      ),
    ),
  }));

  const income = sum(incomes.map((item) => item.income));

  return GOALS.map((goal) => {
    const shares = incomes.map((item) => ({
      memberId: item.member.id,
      planned: new Big(item.income)
        .times(item.member.percentages[goal.id])
        .div(100)
        .round(0, Big.roundHalfUp)
        .toNumber(),
      percentage: item.member.percentages[goal.id],
    }));

    const planned = sum(shares.map((share) => share.planned));

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

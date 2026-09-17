import { GOALS } from "@/features/budget/constants";
import type {
  BankAccount,
  Transaction,
  MemberBudget,
} from "@/features/budget/domain/types";

export function accountBalance(
  account: BankAccount,
  transactions: Transaction[],
): number {
  return transactions.reduce((balance, transaction) => {
    if (transaction.accountId !== account.id) return balance;
    switch (transaction.kind) {
      case "income":
        return balance + transaction.amount;
      case "expense":
        return balance - transaction.amount;
      default: {
        const _exhaustive: never = transaction.kind;
        return _exhaustive;
      }
    }
  }, account.openingBalance ?? 0);
}

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
    const planned = incomes.reduce(
      (sum, item) =>
        sum +
        Math.round((item.income * item.member.percentages[goal.id]) / 100),
      0,
    );
    return {
      id: goal.id,
      planned,
      percentage:
        members.length === 1
          ? members[0].percentages[goal.id]
          : income > 0
            ? (planned / income) * 100
            : null,
    };
  });
}

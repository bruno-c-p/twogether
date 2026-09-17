import { GOALS } from "@/features/budget/constants";
import type {
  BankAccount,
  Transaction,
  GoalPercentages,
  MemberBudget,
} from "@/features/budget/types";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export const money = (cents: number) => moneyFormatter.format(cents / 100);

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const whole = (digits.slice(0, -2) || "0").replace(/^0+/, "") || "0";
  const cents = digits.slice(-2).padStart(2, "0");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents}`;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return localDate(new Date(year, number - 1 + offset, 1)).slice(0, 7);
}

export function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return monthFormatter
    .format(new Date(year, number - 1, 1))
    .replace(" de ", " ");
}

function parseCents(value: string, min: number): number | null {
  const normalized = value.trim().replace(/^R\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized))
    return null;
  const [whole, decimals = ""] = normalized.replaceAll(".", "").split(",");
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= min && cents <= 99999999999
    ? cents
    : null;
}

export function parseAmount(value: string): number | null {
  return parseCents(value, 1);
}

export function parseBalance(value: string): number | null {
  if (!value.trim()) return 0;
  return parseCents(value, 0);
}

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

export function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .slice(0, 24);
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

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

export function isBankAccount(value: unknown): value is BankAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Record<string, unknown>;
  return (
    typeof account.id === "string" &&
    account.id.length > 0 &&
    typeof account.name === "string" &&
    account.name.trim().length > 0 &&
    typeof account.openingBalance === "number" &&
    Number.isSafeInteger(account.openingBalance) &&
    account.openingBalance >= 0 &&
    account.openingBalance <= 99999999999
  );
}

export function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.description === "string" &&
    t.description.trim().length > 0 &&
    typeof t.amount === "number" &&
    Number.isSafeInteger(t.amount) &&
    t.amount > 0 &&
    t.amount <= 99999999999 &&
    (t.kind === "expense" || t.kind === "income") &&
    isDate(t.date) &&
    (t.kind === "income"
      ? t.goal === null
      : GOALS.some((g) => g.id === t.goal)) &&
    Array.isArray(t.tags) &&
    t.tags.every((tag) => typeof tag === "string" && tag.length <= 24) &&
    typeof t.accountId === "string" &&
    t.accountId.length > 0
  );
}

export function isGoalPercentages(value: unknown): value is GoalPercentages {
  if (!value || typeof value !== "object") return false;
  const values = value as Record<string, unknown>;
  return (
    GOALS.every(
      ({ id }) =>
        typeof values[id] === "number" &&
        Number.isFinite(values[id]) &&
        Math.abs(
          Number(values[id]) * 100 - Math.round(Number(values[id]) * 100),
        ) < 0.000001 &&
        Number(values[id]) >= 0 &&
        Number(values[id]) <= 100,
    ) &&
    Math.round(
      GOALS.reduce((sum, { id }) => sum + Number(values[id]) * 100, 0),
    ) === 10000
  );
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

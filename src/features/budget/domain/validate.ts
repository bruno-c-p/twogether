import { GOALS } from "@/features/budget/constants";
import type {
  BankAccount,
  Transaction,
  GoalPercentages,
} from "@/features/budget/domain/types";

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` ===
      value
  );
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

import { createServerFn } from "@tanstack/react-start";
import { sessionToken } from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  isBankAccount,
  isGoalPercentages,
  isTransaction,
} from "@/features/budget/domain/validate";
import { runMutation } from "@/server/request-error";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";

function invalid(): never {
  throw new Error("Requisição inválida.");
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}

function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) invalid();
  return Number(value);
}

function parseFollowing(
  value: unknown,
): { id: string; revision: number }[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof (item as { id?: unknown }).id !== "string" ||
        !Number.isSafeInteger((item as { revision?: unknown }).revision),
    )
  )
    invalid();
  return value as { id: string; revision: number }[];
}

export function parseSaveTransaction(input: unknown): {
  transaction: Transaction;
  occurrences?: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isTransaction(data.transaction)) invalid();
  if (data.occurrences === undefined) return { transaction: data.transaction };
  if (
    typeof data.occurrences !== "number" ||
    !Number.isInteger(data.occurrences) ||
    data.occurrences < 1 ||
    data.occurrences > 120
  )
    invalid();
  return { transaction: data.transaction, occurrences: data.occurrences };
}

export function parseDeleteTransaction(input: unknown): {
  id: string;
  revision: number;
  following?: { id: string; revision: number }[];
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  const following = parseFollowing(data.following);
  return following
    ? { id: text(data.id), revision: revision(data.revision), following }
    : { id: text(data.id), revision: revision(data.revision) };
}

export function parseRestoreTransaction(input: unknown): {
  id: string;
  revision: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  return { id: text(data.id), revision: revision(data.revision) };
}

export function parseSaveAccount(input: unknown): { account: BankAccount } {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isBankAccount(data.account)) invalid();
  return { account: data.account };
}

export function parseDeleteAccount(input: unknown): {
  id: string;
  revision: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  return { id: text(data.id), revision: revision(data.revision) };
}

export function parseSavePercentages(input: unknown): {
  percentages: GoalPercentages;
  revision: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isGoalPercentages(data.percentages)) invalid();
  return {
    percentages: data.percentages,
    revision: revision(data.revision),
  };
}

export const loadBudget = createServerFn({ method: "GET" }).handler(() => {
  return getBudgetStore().snapshot(sessionToken());
});

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().saveTransaction(context.user, context.household, data),
    ),
  );

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteTransaction(context.user, context.household, data),
    ),
  );

export const restoreTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseRestoreTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().restoreTransaction(
        context.user,
        context.household,
        data,
      ),
    ),
  );

export const saveAccount = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveAccount)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().saveAccount(
        context.user,
        context.household,
        data.account,
      ),
    ),
  );

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteAccount)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteAccount(context.user, context.household, data),
    ),
  );

export const savePercentages = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSavePercentages)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().savePercentages(context.user, context.household, data),
    ),
  );

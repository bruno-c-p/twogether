import {
  bankAccountSchema,
  goalPercentagesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";

export function isBankAccount(value: unknown): value is BankAccount {
  return bankAccountSchema.safeParse(value).success;
}

export function isTransaction(value: unknown): value is Transaction {
  return transactionSchema.safeParse(value).success;
}

export function isGoalPercentages(value: unknown): value is GoalPercentages {
  return goalPercentagesSchema.safeParse(value).success;
}

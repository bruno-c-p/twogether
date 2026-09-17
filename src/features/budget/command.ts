import { isBudgetToken } from "@/features/budget/search";
import {
  isBankAccount,
  isGoalPercentages,
  isTransaction,
} from "@/features/budget/services/budget";
import type { BudgetCommand } from "@/features/budget/types";

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

function parseAction(value: unknown): BudgetCommand["action"] {
  switch (value) {
    case "profile":
    case "create":
    case "join":
    case "invite":
    case "revoke-invite":
    case "save":
    case "delete":
    case "undo-delete":
    case "save-account":
    case "delete-account":
    case "percentages":
      return value;
    default:
      invalid();
  }
}

export function parseRequestLink(input: unknown): {
  email: string;
  invite?: string;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  const email = text(data.email);
  if (data.invite === undefined) return { email };
  if (!isBudgetToken(data.invite)) invalid();
  return { email, invite: data.invite };
}

export function parseDevLogin(input: unknown): { email: string } {
  if (!input || typeof input !== "object") invalid();
  return { email: text((input as Record<string, unknown>).email) };
}

export function parseAccessPayload(input: unknown): {
  token: string;
  convite?: string;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isBudgetToken(data.token)) invalid();
  if (data.convite !== undefined && !isBudgetToken(data.convite)) invalid();
  return data.convite
    ? { token: data.token, convite: data.convite }
    : { token: data.token };
}

export function parseBudgetCommand(input: unknown): BudgetCommand {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  const action = parseAction(data.action);
  switch (action) {
    case "join":
      return { action, token: text(data.token) };
    case "profile":
      return { action, name: text(data.name) };
    case "create":
    case "invite":
    case "revoke-invite":
      return { action };
    case "save": {
      if (!isTransaction(data.transaction)) invalid();
      if (data.occurrences === undefined)
        return { action, transaction: data.transaction };
      if (
        typeof data.occurrences !== "number" ||
        !Number.isInteger(data.occurrences) ||
        data.occurrences < 1 ||
        data.occurrences > 120
      )
        invalid();
      return {
        action,
        transaction: data.transaction,
        occurrences: data.occurrences,
      };
    }
    case "delete": {
      const command = {
        action,
        id: text(data.id),
        revision: revision(data.revision),
      };
      if (data.following === undefined) return command;
      if (
        !Array.isArray(data.following) ||
        data.following.some(
          (item) =>
            !item ||
            typeof item !== "object" ||
            typeof (item as { id?: unknown }).id !== "string" ||
            !Number.isSafeInteger((item as { revision?: unknown }).revision),
        )
      )
        invalid();
      return {
        ...command,
        following: data.following as { id: string; revision: number }[],
      };
    }
    case "undo-delete":
    case "delete-account":
      return {
        action,
        id: text(data.id),
        revision: revision(data.revision),
      };
    case "save-account":
      if (!isBankAccount(data.account)) invalid();
      return { action, account: data.account };
    case "percentages":
      if (!isGoalPercentages(data.percentages)) invalid();
      return {
        action,
        percentages: data.percentages,
        revision: revision(data.revision),
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

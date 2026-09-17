import { describe, expect, test } from "vitest";
import {
  parseDeleteAccount,
  parseDeleteTransaction,
  parseRestoreTransaction,
  parseSaveAccount,
  parseSavePercentages,
  parseSaveTransaction,
} from "@/features/budget/budget.functions";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

const transaction = {
  id: "transaction-1",
  description: "Mercado",
  amount: 10000,
  kind: "expense" as const,
  date: "2026-09-14",
  goal: "fixed" as const,
  tags: ["casa"],
  accountId: "account-1",
};

describe("budget validators", () => {
  test("parseSaveTransaction reuses isTransaction and occurrence bounds", () => {
    expect(parseSaveTransaction({ transaction })).toEqual({ transaction });
    expect(parseSaveTransaction({ transaction, occurrences: 12 })).toEqual({
      transaction,
      occurrences: 12,
    });
    expect(() =>
      parseSaveTransaction({ transaction: { ...transaction, amount: 0 } }),
    ).toThrow("Requisição inválida.");
    expect(() => parseSaveTransaction({ transaction, occurrences: 0 })).toThrow(
      "Requisição inválida.",
    );
    expect(() =>
      parseSaveTransaction({ transaction, occurrences: "12" }),
    ).toThrow("Requisição inválida.");
    expect(parseSaveTransaction({ action: "save", transaction })).toEqual({
      transaction,
    });
  });

  test("parseDeleteTransaction and parseRestoreTransaction require id and revision", () => {
    expect(
      parseDeleteTransaction({ id: "transaction-1", revision: 1 }),
    ).toEqual({ id: "transaction-1", revision: 1 });
    expect(
      parseDeleteTransaction({
        id: "transaction-1",
        revision: 1,
        following: [{ id: "next", revision: 2 }],
      }),
    ).toEqual({
      id: "transaction-1",
      revision: 1,
      following: [{ id: "next", revision: 2 }],
    });
    expect(() => parseDeleteTransaction({ id: "transaction-1" })).toThrow(
      "Requisição inválida.",
    );
    expect(
      parseRestoreTransaction({ id: "transaction-1", revision: 2 }),
    ).toEqual({ id: "transaction-1", revision: 2 });
  });

  test("parseSaveAccount reuses isBankAccount", () => {
    const account = { id: "account-1", name: "Nubank", openingBalance: 0 };
    expect(parseSaveAccount({ account })).toEqual({ account });
    expect(() =>
      parseSaveAccount({ account: { ...account, openingBalance: -1 } }),
    ).toThrow("Requisição inválida.");
  });

  test("parseDeleteAccount requires id and revision", () => {
    expect(parseDeleteAccount({ id: "account-1", revision: 0 })).toEqual({
      id: "account-1",
      revision: 0,
    });
    expect(() => parseDeleteAccount({ id: "account-1" })).toThrow(
      "Requisição inválida.",
    );
  });

  test("parseSavePercentages reuses isGoalPercentages", () => {
    expect(
      parseSavePercentages({
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).toMatchObject({ revision: 0 });
    expect(() =>
      parseSavePercentages({
        percentages: { ...DEFAULT_PERCENTAGES, fixed: 90 },
        revision: 0,
      }),
    ).toThrow("Requisição inválida.");
  });
});

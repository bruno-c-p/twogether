import { describe, expect, test } from "vitest";
import { budgetMutations } from "@/features/budget/actions/mutations";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import { cents } from "@/test/cents";

const parseSaveTransaction = budgetMutations.saveTransaction.parse;

const parseDeleteTransaction = budgetMutations.deleteTransaction.parse;

const parseRestoreTransaction = budgetMutations.restoreTransaction.parse;

const parseSettleSplit = budgetMutations.settleSplit.parse;

const parseUnsettleSplit = budgetMutations.unsettleSplit.parse;

const parseSavePercentages = budgetMutations.savePercentages.parse;

const transaction = {
  id: "transaction-1",
  description: "Mercado",
  amount: cents(10000),
  kind: "expense" as const,
  date: "2026-09-14",
  goal: "fixed" as const,
  accountId: "account-1",
};

describe("parseSaveTransaction", () => {
  test("validates the transaction schema and occurrence bounds", () => {
    expect(parseSaveTransaction({ transaction })).toEqual({ transaction });
    expect(parseSaveTransaction({ transaction, occurrences: 12 })).toEqual({
      transaction,
      occurrences: 12,
    });
    expect(() =>
      parseSaveTransaction({ transaction: { ...transaction, amount: 0 } }),
    ).toThrow("Digite um valor válido, como 45,90.");

    for (const occurrences of [0, -1, 1.5, 121])
      expect(() => parseSaveTransaction({ transaction, occurrences })).toThrow(
        "Escolha entre 1 e 120 ocorrências.",
      );

    expect(() =>
      parseSaveTransaction({
        transaction: { ...transaction, kind: "income", goal: null, split: {} },
      }),
    ).toThrow("Só despesas podem ser divididas.");
    expect(() =>
      // @ts-expect-error: the parser must reject untrusted request bodies
      parseSaveTransaction({ transaction, occurrences: "12" }),
    ).toThrow("Escolha entre 1 e 120 ocorrências.");
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(parseSaveTransaction({ action: "save", transaction })).toEqual({
      transaction,
    });
  });
});

describe("parseDeleteTransaction", () => {
  test("requires id and revision", () => {
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
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseDeleteTransaction({ id: "transaction-1" })).toThrow(
      "Versão inválida. Atualize a página.",
    );
  });
});

describe("parseRestoreTransaction", () => {
  test("requires id and revision", () => {
    expect(
      parseRestoreTransaction({ id: "transaction-1", revision: 2 }),
    ).toEqual({ id: "transaction-1", revision: 2 });
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseRestoreTransaction({ revision: 2 })).toThrow(
      "Informe um identificador válido.",
    );
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseRestoreTransaction({ id: "transaction-1" })).toThrow(
      "Versão inválida. Atualize a página.",
    );
    expect(() => parseRestoreTransaction({ id: "   ", revision: 2 })).toThrow(
      "Informe um identificador válido.",
    );
    expect(() =>
      parseRestoreTransaction({ id: "transaction-1", revision: -1 }),
    ).toThrow("Versão inválida. Atualize a página.");
  });
});

const input = {
  id: "rent",
  revision: 1,
  date: "2026-09-20",
};

describe("split settlement input", () => {
  test("validates settle and unsettle payloads", () => {
    expect(parseSettleSplit(input)).toEqual(input);
    expect(() => parseSettleSplit({ ...input, date: "2026-02-30" })).toThrow(
      "Escolha uma data válida.",
    );
    expect(parseUnsettleSplit({ id: "rent", revision: 2 })).toEqual({
      id: "rent",
      revision: 2,
    });
    expect(() => parseUnsettleSplit({ id: "rent", revision: -1 })).toThrow(
      "Versão inválida. Atualize a página.",
    );
  });
});

describe("parseSavePercentages", () => {
  test("keeps the full percentages object and rejects a total other than 100", () => {
    expect(
      parseSavePercentages({
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).toEqual({
      percentages: DEFAULT_PERCENTAGES,
      revision: 0,
    });
    expect(() =>
      parseSavePercentages({
        percentages: { ...DEFAULT_PERCENTAGES, fixed: 90 },
        revision: 0,
      }),
    ).toThrow("Os percentuais devem somar 100%.");
  });
});

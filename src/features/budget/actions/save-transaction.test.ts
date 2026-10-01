import { describe, expect, test } from "vitest";
import { parseSaveTransaction } from "@/features/budget/actions/save-transaction";

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

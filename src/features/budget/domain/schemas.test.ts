import type { z } from "zod";
import { describe, expect, expectTypeOf, test } from "vitest";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import {
  dateSchema,
  monthSchema,
  GOAL_IDS,
  goalPercentagesSchema,
  transactionFormSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type { Transaction } from "@/features/budget/domain/types";
import { firstIssueMessage } from "@/lib/zod-errors";

describe("schemas", () => {
  test("goal ids follow the goal list", () => {
    expect(GOAL_IDS).toEqual(GOALS.map((goal) => goal.id));
  });

  test("a parsed transaction is typed without the loose index signature", () => {
    expectTypeOf<
      z.output<typeof transactionSchema>
    >().toEqualTypeOf<Transaction>();
  });

  test("a stored transaction keeps keys this version does not know", () => {
    const parsed = transactionSchema.parse({
      id: "t1",
      description: "Mercado",
      amount: 4590,
      kind: "expense",
      date: "2026-10-01",
      goal: "fixed",
      split: { paidAt: "2026-10-02", note: "pix" },
      future: true,
    });

    expect(parsed).toMatchObject({
      future: true,
      split: { paidAt: "2026-10-02", note: "pix" },
    });
  });

  test("a split that is not an object reports the split message", () => {
    const parsed = transactionSchema.safeParse({
      id: "t1",
      description: "Mercado",
      amount: 4590,
      kind: "expense",
      date: "2026-10-01",
      goal: "fixed",
      split: "yes",
    });

    expect(parsed.success || firstIssueMessage(parsed.error)).toBe(
      "Divisão inválida.",
    );
  });

  test("freedom belongs to transfers, except on legacy split expenses", () => {
    const stored = {
      id: "t1",
      description: "Tesouro Direto",
      amount: 50000,
      date: "2026-10-01",
    };

    const message = (value: Pick<Transaction, "kind" | "goal" | "split">) => {
      const parsed = transactionSchema.safeParse({ ...stored, ...value });

      return parsed.success || firstIssueMessage(parsed.error);
    };

    expect(message({ kind: "transfer", goal: "freedom" })).toBe(true);
    expect(message({ kind: "transfer", goal: "targets" })).toBe(
      "Transferências vão para Liberdade financeira.",
    );
    expect(message({ kind: "transfer", goal: "freedom", split: {} })).toBe(
      "Só despesas podem ser divididas.",
    );
    expect(message({ kind: "expense", goal: "freedom" })).toBe(
      "Use Transferência para Liberdade financeira.",
    );
    expect(message({ kind: "expense", goal: "freedom", split: {} })).toBe(true);
  });

  test("the form applies the same freedom rules", () => {
    const base = {
      amount: "500,00",
      description: "Tesouro Direto",
      date: "2026-10-01",
      occurrences: 1,
    };

    const valid = (
      value: Pick<
        z.input<typeof transactionFormSchema>,
        "kind" | "goal" | "split"
      >,
    ) => transactionFormSchema.safeParse({ ...base, ...value }).success;

    expect(valid({ kind: "transfer", goal: "freedom", split: false })).toBe(
      true,
    );
    expect(valid({ kind: "transfer", goal: null, split: false })).toBe(false);
    expect(valid({ kind: "expense", goal: "freedom", split: false })).toBe(
      false,
    );
    expect(valid({ kind: "expense", goal: "freedom", split: true })).toBe(true);
  });

  test("a date must exist on the calendar", () => {
    expect(dateSchema.safeParse("2026-02-28").success).toBe(true);
    expect(dateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(dateSchema.safeParse("1899-12-31").success).toBe(false);
  });

  test("months match the supported calendar range", () => {
    for (const value of ["1900-01", "9999-12"]) {
      expect(monthSchema.safeParse(value).success).toBe(true);
    }

    for (const value of [
      "0000-01",
      "1899-12",
      "10000-01",
      "2026-00",
      "2026-13",
    ]) {
      expect(monthSchema.safeParse(value).success).toBe(false);
    }
  });

  test("zod rejects an infinite percentage with the range message", () => {
    const parsed = goalPercentagesSchema.safeParse({
      ...DEFAULT_PERCENTAGES,
      fixed: Number.POSITIVE_INFINITY,
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success)
      expect(firstIssueMessage(parsed.error)).toBe(
        "Informe um percentual entre 0 e 100.",
      );
  });

  test("the form keeps the split minimum and the goal rules", () => {
    const form = transactionFormSchema;

    const base = {
      amount: "0,01",
      description: "Pão",
      date: "2026-09-10",
      goal: null,
      kind: "expense" as const,
      occurrences: 1,
      split: true,
    };

    const parsed = form.safeParse(base);

    expect(parsed.success).toBe(false);

    if (!parsed.success)
      expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual([
        "amount",
        "goal",
      ]);

    expect(
      form.safeParse({ ...base, kind: "income", goal: "fixed", split: false })
        .success,
    ).toBe(false);
  });
});

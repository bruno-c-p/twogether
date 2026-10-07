import { describe, expect, test } from "vitest";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import {
  dateSchema,
  monthSchema,
  GOAL_IDS,
  goalPercentagesSchema,
  transactionFormSchema,
} from "@/features/budget/domain/schemas";
import { firstIssueMessage } from "@/lib/zod-errors";

describe("schemas", () => {
  test("goal ids follow the goal list", () => {
    expect(GOAL_IDS).toEqual(GOALS.map((goal) => goal.id));
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

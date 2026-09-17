import { describe, expect, it } from "vitest";
import type { Transaction } from "@/features/budget/domain/types";
import { summarizeExpenses } from "@/features/budget/services/expense-charts";

const expense = (changes: Partial<Transaction> = {}): Transaction => ({
  id: "one",
  description: "Compra",
  kind: "expense",
  amount: 101,
  date: "2026-09-01",
  goal: "fixed",
  tags: [],
  accountId: "account-1",
  ...changes,
});

describe("expense charts", () => {
  it("counts only expenses in the selected month and preserves every cent across tags", () => {
    const result = summarizeExpenses(
      [
        expense({ tags: ["B", "A", "A"] }),
        expense({ amount: 50 }),
        expense({ kind: "income", amount: 100000 }),
        expense({ date: "2026-08-01" }),
      ],
      "2026-09",
    );
    expect(result.total).toBe(151);
    expect(result.days[0]).toBe(151);
    expect(result.firstWeekday).toBe(2);
    expect(result.days).toHaveLength(30);
    expect(result.tags).toEqual([
      { name: "A", amount: 51 },
      { name: "B", amount: 50 },
      { name: null, amount: 50 },
    ]);
    expect(result.tags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(
      result.total,
    );
  });
  it("handles empty leap-year February", () => {
    const result = summarizeExpenses([], "2028-02");
    expect(result.days).toHaveLength(29);
    expect(result.days.every((amount) => amount === 0)).toBe(true);
    expect(result.tags).toEqual([]);
    expect(result.total).toBe(0);
  });
});

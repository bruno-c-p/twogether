import { expect, it } from "vitest";
import { summarizeHistory } from "./financial-history";
import type { Transaction } from "../types";

it("includes empty months, crosses years and keeps income and expenses in cents", () => {
  const transaction = { id: "1", description: "Teste", goal: null, tags: [] };
  const transactions: Transaction[] = [
    { ...transaction, date: "2025-12-31", kind: "income", amount: 500001 },
    { ...transaction, date: "2026-01-01", kind: "expense", amount: 101 },
    { ...transaction, date: "2026-01-31", kind: "expense", amount: 52 },
    { ...transaction, date: "2025-11-30", kind: "expense", amount: 999 },
    { ...transaction, date: "2026-03-01", kind: "income", amount: 999 },
  ];
  expect(summarizeHistory(transactions, "2026-02", 3).map(({ month, income, expense }) => ({ month, income, expense }))).toEqual([
    { month: "2025-12", income: 500001, expense: 0 },
    { month: "2026-01", income: 0, expense: 153 },
    { month: "2026-02", income: 0, expense: 0 },
  ]);
  expect(summarizeHistory([], "2026-02", 12)).toHaveLength(12);
});

import type { MemberBudget, Transaction } from "@/features/budget/domain/types";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

export const ana: MemberBudget = {
  id: "ana",
  name: "Ana",
  percentages: { ...DEFAULT_PERCENTAGES },
  percentagesRevision: 0,
};

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    description: "Mercado",
    amount: 4590,
    kind: "expense",
    date: "2026-09-10",
    goal: "fixed",
    memberId: "ana",
    revision: 1,
    ...overrides,
  };
}

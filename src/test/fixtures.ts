import type {
  BankAccount,
  MemberBudget,
  Transaction,
} from "@/features/budget/domain/types";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

export const ana: MemberBudget = {
  id: "ana",
  name: "Ana",
  percentages: { ...DEFAULT_PERCENTAGES },
  percentagesRevision: 0,
};

export const nubank: BankAccount = {
  id: "nubank",
  name: "Nubank",
  openingBalance: 100000,
  revision: 1,
};

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    description: "Mercado",
    amount: 4590,
    kind: "expense",
    date: "2026-09-10",
    goal: "fixed",
    tags: ["casa"],
    accountId: "nubank",
    memberId: "ana",
    revision: 1,
    ...overrides,
  };
}

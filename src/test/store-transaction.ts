import type { Transaction } from "@/features/budget/domain/types";
import { cents } from "@/test/cents";

export function transaction(memberId: string): Transaction {
  return {
    id: "transaction-1",
    description: "Mercado",
    amount: cents(10000),
    kind: "expense",
    date: "2026-09-14",
    goal: "fixed",
    memberId,
  };
}

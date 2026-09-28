import { describe, expect, test } from "vitest";
import {
  partnerShare,
  splitDebt,
  usTransactions,
} from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";

const base: Transaction = {
  id: "t",
  description: "Aluguel",
  amount: 200000,
  kind: "expense",
  date: "2026-09-05",
  goal: "fixed",
  tags: [],
  accountId: "a",
  memberId: "ana",
};

describe("split helpers", () => {
  test("partner owes the lower half on odd cents", () => {
    expect(partnerShare(200000)).toBe(100000);
    expect(partnerShare(10001)).toBe(5000);
    expect(partnerShare(3)).toBe(1);
  });

  test("net debt counts unpaid splits in both directions", () => {
    const transactions: Transaction[] = [
      { ...base, id: "rent", split: {} },
      { ...base, id: "market", amount: 30001, memberId: "bia", split: {} },
      { ...base, id: "paid", split: { paidAt: "2026-09-10" } },
      { ...base, id: "plain" },
      { ...base, id: "repay", settlementOf: "old", split: {} },
    ];

    const ana = splitDebt(transactions, "ana");
    expect(ana.net).toBe(100000 - 15000);
    expect(ana.unpaid.map((t) => t.id).sort()).toEqual(["market", "rent"]);
    expect(splitDebt(transactions, "bia").net).toBe(15000 - 100000);
    expect(splitDebt([], "ana")).toEqual({ net: 0, unpaid: [] });
  });

  test("Us view drops repayment entries", () => {
    const list: Transaction[] = [
      base,
      { ...base, id: "income", kind: "income", goal: null, settlementOf: "t" },
    ];

    expect(usTransactions(list).map((t) => t.id)).toEqual(["t"]);
  });
});

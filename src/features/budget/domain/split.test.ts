import { describe, expect, test } from "vitest";
import {
  partnerShare,
  splitDebt,
  usTransactions,
} from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import { cents } from "@/test/cents";

const base: Transaction = {
  id: "t",
  description: "Aluguel",
  amount: cents(200000),
  kind: "expense",
  date: "2026-09-05",
  goal: "fixed",
  memberId: "ana",
};

describe("split helpers", () => {
  test("partner owes the lower half on odd cents", () => {
    expect(partnerShare(cents(200000))).toBe(cents(100000));
    expect(partnerShare(cents(10001))).toBe(cents(5000));
    expect(partnerShare(cents(3))).toBe(cents(1));
  });

  test("net debt counts unpaid splits in both directions", () => {
    const transactions: Transaction[] = [
      { ...base, id: "rent", split: {} },
      {
        ...base,
        id: "market",
        amount: cents(30001),
        memberId: "bia",
        split: {},
      },
      { ...base, id: "paid", split: { paidAt: "2026-09-10" } },
      { ...base, id: "plain" },
      { ...base, id: "repay", settlementOf: "old", split: {} },
    ];

    const ana = splitDebt(transactions, "ana", "2026-09-30");
    expect(ana.net).toBe(100000 - 15000);
    expect(ana.unpaid.map((t) => t.id).sort()).toEqual(["market", "rent"]);
    expect(splitDebt(transactions, "bia", "2026-09-30").net).toBe(
      15000 - 100000,
    );
    expect(splitDebt([], "ana", "2026-09-30")).toEqual({ net: 0, unpaid: [] });
  });

  test("splits dated after today are not owed yet", () => {
    const transactions: Transaction[] = [
      { ...base, id: "past", date: "2026-09-01", split: {} },
      { ...base, id: "today", date: "2026-09-05", split: {} },
      { ...base, id: "tomorrow", date: "2026-09-06", split: {} },
      { ...base, id: "next-month", date: "2026-10-05", split: {} },
    ];

    const ana = splitDebt(transactions, "ana", "2026-09-05");
    expect(ana.unpaid.map((t) => t.id)).toEqual(["past", "today"]);
    expect(ana.net).toBe(2 * 100000);
  });

  test("Us view drops repayment entries", () => {
    const list: Transaction[] = [
      base,
      { ...base, id: "income", kind: "income", goal: null, settlementOf: "t" },
    ];

    expect(usTransactions(list).map((t) => t.id)).toEqual(["t"]);
  });
});

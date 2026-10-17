import { describe, expect, test } from "vitest";
import { transactionStatus } from "@/features/budget/domain/status";
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

const open = {
  repayment: false,
  split: false,
  paidAt: undefined,
  userOwes: false,
  lock: undefined,
};

describe("transactionStatus", () => {
  test("a plain transaction is open to everyone", () => {
    expect(transactionStatus(base, "ana")).toEqual(open);
    expect(transactionStatus(base, "bia")).toEqual(open);
  });

  test("both rows of a repayment are locked and never splits", () => {
    for (const kind of ["income", "expense"] as const)
      expect(
        transactionStatus(
          { ...base, kind, goal: null, settlementOf: "rent", split: {} },
          "bia",
        ),
      ).toEqual({ ...open, repayment: true, lock: "repayment" });
  });

  test("an unpaid split is owed by the partner who did not pay", () => {
    const rent = { ...base, split: {} };

    expect(transactionStatus(rent, "ana")).toEqual({ ...open, split: true });
    expect(transactionStatus(rent, "bia")).toEqual({
      ...open,
      split: true,
      userOwes: true,
    });
  });

  test("a paid split is locked with its payment date", () => {
    const rent = {
      ...base,
      split: { paidAt: "2026-09-10T12:00:00Z", paidBy: "bia" },
    };

    const paid = {
      ...open,
      split: true,
      paidAt: "2026-09-10T12:00:00Z",
      lock: "paid",
    };

    expect(transactionStatus(rent, "ana")).toEqual(paid);
    expect(transactionStatus(rent, "bia")).toEqual({ ...paid, userOwes: true });
  });

  test("a split without a payer is owed by whoever reads it", () => {
    expect(
      transactionStatus({ ...base, memberId: undefined, split: {} }, "ana"),
    ).toEqual({ ...open, split: true, userOwes: true });
  });

  test("only expenses split", () => {
    expect(
      transactionStatus(
        { ...base, kind: "income", goal: null, split: { paidAt: "x" } },
        "bia",
      ),
    ).toEqual(open);
  });
});

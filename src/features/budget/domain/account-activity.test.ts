import { describe, expect, it } from "vitest";
import { accountMonthActivity } from "@/features/budget/domain/calc";
import { nubank, transaction } from "@/test/fixtures";

describe("accountMonthActivity", () => {
  it("sums income and expenses of the month for one account, newest first", () => {
    const activity = accountMonthActivity(
      nubank,
      [
        transaction({ id: "a", amount: 1000, date: "2026-09-05" }),
        transaction({
          id: "b",
          amount: 5000,
          kind: "income",
          date: "2026-09-12",
        }),
        transaction({ id: "c", amount: 700, date: "2026-08-30" }),
        transaction({ id: "d", amount: 900, accountId: "other" }),
      ],
      "2026-09",
    );

    expect(activity.entered).toBe(5000);
    expect(activity.left).toBe(1000);
    expect(activity.transactions.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("is empty when the account has no movement in the month", () => {
    const activity = accountMonthActivity(nubank, [], "2026-09");

    expect(activity).toEqual({ entered: 0, left: 0, transactions: [] });
  });
});

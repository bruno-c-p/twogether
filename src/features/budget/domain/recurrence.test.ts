import { describe, expect, test } from "vitest";
import { firstOccurrence } from "@/features/budget/domain/recurrence";
import type { Transaction } from "@/features/budget/domain/types";

const base: Transaction = {
  id: "t1",
  description: "Aluguel",
  amount: 150000,
  kind: "expense",
  date: "2026-09-05",
  goal: "fixed",
  tags: [],
  accountId: "a1",
};

const newId = () => "series-1";

describe("firstOccurrence", () => {
  test("a single new transaction has no series and belongs to the author", () => {
    const first = firstOccurrence({
      transaction: base,
      previous: undefined,
      recurring: false,
      userId: "ana",
      newId,
    });

    expect(first.recurrenceId).toBeUndefined();
    expect(first.recurrenceIndex).toBeUndefined();
    expect(first.memberId).toBe("ana");
    expect(first.createdBy).toBe("ana");
  });

  test("a new recurring transaction starts a series at index 0", () => {
    const first = firstOccurrence({
      transaction: base,
      previous: undefined,
      recurring: true,
      userId: "ana",
      newId,
    });

    expect(first.recurrenceId).toBe("series-1");
    expect(first.recurrenceIndex).toBe(0);
  });

  test("an edit keeps the stored series, member and author", () => {
    const first = firstOccurrence({
      transaction: { ...base, description: "Aluguel novo" },
      previous: {
        ...base,
        recurrenceId: "old-series",
        recurrenceIndex: 3,
        memberId: "bia",
        createdBy: "ana",
      },
      recurring: true,
      userId: "bia",
      newId,
    });

    expect(first).toMatchObject({
      description: "Aluguel novo",
      recurrenceId: "old-series",
      recurrenceIndex: 3,
      memberId: "bia",
      createdBy: "ana",
    });
  });

  test("an edit of a legacy row without memberId falls back to its author", () => {
    const first = firstOccurrence({
      transaction: base,
      previous: { ...base, createdBy: "ana" },
      recurring: false,
      userId: "bia",
      newId,
    });

    expect(first.memberId).toBe("ana");
    expect(first.createdBy).toBe("ana");
  });
});

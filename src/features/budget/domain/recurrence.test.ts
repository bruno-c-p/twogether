import { describe, expect, test } from "vitest";
import {
  firstOccurrence,
  laterOccurrences,
} from "@/features/budget/domain/recurrence";
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

describe("laterOccurrences", () => {
  const series = [2, 0, 1].map((index) => ({
    ...base,
    id: `r${index}`,
    recurrenceId: "rent",
    recurrenceIndex: index,
  }));

  test("lists only the later occurrences of the same series", () => {
    const other = {
      ...base,
      id: "o3",
      recurrenceId: "gym",
      recurrenceIndex: 3,
    };

    expect(
      laterOccurrences([...series, other, base], series[1]).map(
        (item) => item.id,
      ),
    ).toEqual(["r2", "r1"]);
    expect(laterOccurrences(series, series[0])).toEqual([]);
  });

  test("a transaction outside a series has no later occurrences", () => {
    expect(laterOccurrences([...series, base], base)).toEqual([]);
  });
});

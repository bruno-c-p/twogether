import { describe, expect, test } from "vitest";
import {
  firstOccurrence,
  laterInSeries,
  clampedMonthsAfter,
} from "@/features/budget/domain/recurrence";
import type { Transaction } from "@/features/budget/domain/types";
import { cents } from "@/test/cents";

const base: Transaction = {
  id: "t1",
  description: "Aluguel",
  amount: cents(150000),
  kind: "expense",
  date: "2026-09-05",
  goal: "fixed",
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

describe("laterInSeries", () => {
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
      laterInSeries([...series, other, base], series[1]).map((item) => item.id),
    ).toEqual(["r2", "r1"]);
    expect(laterInSeries(series, series[0])).toEqual([]);
  });

  test("a transaction outside a series has no later occurrences", () => {
    expect(laterInSeries([...series, base], base)).toEqual([]);
  });
});

describe("clampedMonthsAfter", () => {
  test("keeps the day and lands on the last day of a shorter month", () => {
    expect(clampedMonthsAfter("2026-09-05", 1)).toBe("2026-10-05");
    expect(clampedMonthsAfter("2028-01-31", 1)).toBe("2028-02-29");
    expect(clampedMonthsAfter("2026-01-31", 1)).toBe("2026-02-28");
    expect(clampedMonthsAfter("2026-01-31", 2)).toBe("2026-03-31");
    expect(clampedMonthsAfter("2026-11-15", 3)).toBe("2027-02-15");
  });

  test("stops at the year 9999", () => {
    expect(clampedMonthsAfter("9999-11-30", 1)).toBe("9999-12-30");
    expect(clampedMonthsAfter("9999-12-31", 1)).toBeUndefined();
  });
});

import { describe, expect, test } from "vitest";
import {
  goalProgress,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";

describe("goalProgress", () => {
  test("under plan reports what remains", () => {
    expect(goalProgress(18000, 42500)).toEqual({
      percent: 42,
      fill: (18000 / 42500) * 100,
      over: 0,
      remaining: 24500,
    });
  });

  test("over plan caps the bar and reports the overage", () => {
    expect(goalProgress(27124, 25500)).toMatchObject({
      percent: 106,
      fill: 100,
      over: 1624,
      remaining: 0,
    });
  });

  test("an empty plan has no percent; any spending fills the bar", () => {
    expect(goalProgress(0, 0)).toMatchObject({ percent: null, fill: 0 });
    expect(goalProgress(500, 0)).toMatchObject({
      percent: null,
      fill: 100,
      over: 500,
    });
  });
});

describe("sumPercentages", () => {
  test("ignores nulls and rounds float noise", () => {
    expect(sumPercentages([33.33, 33.33, 33.34, null])).toBe(100);
    expect(sumPercentages([null, null])).toBe(0);
  });
});

import { describe, expect, test } from "vitest";
import {
  goalProgress,
  progressText,
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

describe("progressText", () => {
  const money = (value: number) => `R$${value}`;

  test("under plan reads the share and what remains", () => {
    expect(progressText(goalProgress(180, 640), false, money)).toBe(
      "28% · restam R$460",
    );
  });

  test("over plan reads the share and the overage", () => {
    expect(progressText(goalProgress(610, 560), false, money)).toBe(
      "109% · R$50 acima",
    );
  });

  test("an empty plan drops the share", () => {
    expect(progressText(goalProgress(0, 0), false, money)).toBe(
      "restam R$0",
    );
  });

  test("hidden values keep only the over-plan warning", () => {
    expect(progressText(goalProgress(610, 560), true, money)).toBe(
      "Acima do planejado",
    );
    expect(progressText(goalProgress(180, 640), true, money)).toBe("");
  });
});

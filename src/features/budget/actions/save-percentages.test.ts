import { describe, expect, test } from "vitest";
import { parseSavePercentages } from "@/features/budget/actions/save-percentages";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

describe("parseSavePercentages", () => {
  test("reuses isGoalPercentages", () => {
    expect(
      parseSavePercentages({
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).toMatchObject({ revision: 0 });
    expect(() =>
      parseSavePercentages({
        percentages: { ...DEFAULT_PERCENTAGES, fixed: 90 },
        revision: 0,
      }),
    ).toThrow("Requisição inválida.");
  });
});

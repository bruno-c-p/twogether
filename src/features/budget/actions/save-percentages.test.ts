import { describe, expect, test } from "vitest";
import { parseSavePercentages } from "@/features/budget/actions/save-percentages";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

describe("parseSavePercentages", () => {
  test("keeps the full percentages object and rejects a total other than 100", () => {
    expect(
      parseSavePercentages({
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).toEqual({
      percentages: DEFAULT_PERCENTAGES,
      revision: 0,
    });
    expect(() =>
      parseSavePercentages({
        percentages: { ...DEFAULT_PERCENTAGES, fixed: 90 },
        revision: 0,
      }),
    ).toThrow("Requisição inválida.");
  });
});

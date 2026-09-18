import { describe, expect, test } from "vitest";
import { parseSaveAccount } from "@/features/budget/actions/save-account";

describe("parseSaveAccount", () => {
  test("reuses isBankAccount", () => {
    const account = { id: "account-1", name: "Nubank", openingBalance: 0 };
    expect(parseSaveAccount({ account })).toEqual({ account });
    expect(() =>
      parseSaveAccount({ account: { ...account, openingBalance: -1 } }),
    ).toThrow("Requisição inválida.");
  });
});

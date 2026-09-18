import { describe, expect, test } from "vitest";
import { parseDeleteAccount } from "@/features/budget/actions/delete-account";

describe("parseDeleteAccount", () => {
  test("requires id and revision", () => {
    expect(parseDeleteAccount({ id: "account-1", revision: 0 })).toEqual({
      id: "account-1",
      revision: 0,
    });
    expect(() => parseDeleteAccount({ id: "account-1" })).toThrow(
      "Requisição inválida.",
    );
  });
});

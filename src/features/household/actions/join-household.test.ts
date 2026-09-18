import { describe, expect, test } from "vitest";
import { parseJoinHousehold } from "@/features/household/actions/join-household";

describe("parseJoinHousehold", () => {
  test("requires a token", () => {
    expect(parseJoinHousehold({ token: "invite-token" })).toEqual({
      token: "invite-token",
    });
    expect(() => parseJoinHousehold({})).toThrow("Requisição inválida.");
    expect(() => parseJoinHousehold(null)).toThrow("Requisição inválida.");
  });
});

import { describe, expect, test } from "vitest";
import { parseJoinHousehold } from "@/features/household/household.functions";

describe("household validators", () => {
  test("parseJoinHousehold requires a token", () => {
    expect(parseJoinHousehold({ token: "invite-token" })).toEqual({
      token: "invite-token",
    });
    expect(() => parseJoinHousehold({})).toThrow("Requisição inválida.");
    expect(() => parseJoinHousehold(null)).toThrow("Requisição inválida.");
  });
});

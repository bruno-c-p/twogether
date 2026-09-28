import { describe, expect, test } from "vitest";
import { parseJoinHousehold } from "@/features/household/actions/join-household";

const token = "a".repeat(64);

describe("parseJoinHousehold", () => {
  test("requires an invite token", () => {
    expect(parseJoinHousehold({ token })).toEqual({ token });
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseJoinHousehold({})).toThrow(
      "Convite inválido. Peça um novo link.",
    );
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseJoinHousehold(null)).toThrow("Requisição inválida.");
    expect(() => parseJoinHousehold({ token: "invite-token" })).toThrow(
      "Convite inválido. Peça um novo link.",
    );
  });
});

import { describe, expect, test } from "vitest";
import { parseAccessPayload } from "@/features/auth/actions/consume-access";

const token = "a".repeat(64);

describe("parseAccessPayload", () => {
  test("keeps the magic-link token and optional invite", () => {
    expect(parseAccessPayload({ token })).toEqual({ token });
    expect(parseAccessPayload({ token, convite: "b".repeat(64) })).toEqual({
      token,
      convite: "b".repeat(64),
    });
    expect(() => parseAccessPayload({ token: "short" })).toThrow(
      "Requisição inválida.",
    );
  });
});

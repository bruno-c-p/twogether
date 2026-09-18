import { describe, expect, test } from "vitest";
import { parseRequestLink } from "@/features/auth/actions/request-link";

const token = "a".repeat(64);

describe("parseRequestLink", () => {
  test("requires a valid invite token when present", () => {
    expect(
      parseRequestLink({
        email: "ana@example.test",
        invite: token,
      }),
    ).toEqual({
      email: "ana@example.test",
      invite: token,
    });
    expect(parseRequestLink({ email: "ana@example.test" })).toEqual({
      email: "ana@example.test",
    });
    expect(() =>
      parseRequestLink({
        email: "ana@example.test",
        invite: "not-a-token",
      }),
    ).toThrow("Requisição inválida.");
  });
});

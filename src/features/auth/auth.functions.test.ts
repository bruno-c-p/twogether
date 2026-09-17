import { describe, expect, test } from "vitest";
import {
  parseAccessPayload,
  parseDevLogin,
  parseRequestLink,
  parseSetName,
} from "@/features/auth/auth.functions";

const token = "a".repeat(64);

describe("auth validators", () => {
  test("parseRequestLink requires a valid invite token when present", () => {
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

  test("parseDevLogin requires an email", () => {
    expect(parseDevLogin({ email: "ana@example.test" })).toEqual({
      email: "ana@example.test",
    });
    expect(() => parseDevLogin({})).toThrow("Requisição inválida.");
  });

  test("parseAccessPayload keeps the magic-link token and optional invite", () => {
    expect(parseAccessPayload({ token })).toEqual({ token });
    expect(parseAccessPayload({ token, convite: "b".repeat(64) })).toEqual({
      token,
      convite: "b".repeat(64),
    });
    expect(() => parseAccessPayload({ token: "short" })).toThrow(
      "Requisição inválida.",
    );
  });

  test("parseSetName requires a name", () => {
    expect(parseSetName({ name: "Ana" })).toEqual({ name: "Ana" });
    expect(() => parseSetName({})).toThrow("Requisição inválida.");
  });
});

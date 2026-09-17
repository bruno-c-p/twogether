import { describe, expect, test } from "vitest";
import {
  parseAccessPayload,
  parseBudgetCommand,
  parseDevLogin,
  parseRequestLink,
} from "@/features/budget/command";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";

const token = "a".repeat(64);

describe("parseBudgetCommand", () => {
  test("accepts known actions and rejects unknown ones", () => {
    expect(parseBudgetCommand({ action: "create" })).toEqual({
      action: "create",
    });
    expect(
      parseBudgetCommand({
        action: "percentages",
        percentages: DEFAULT_PERCENTAGES,
        revision: 0,
      }),
    ).toMatchObject({ action: "percentages", revision: 0 });
    expect(() => parseBudgetCommand({ action: "explode" })).toThrow(
      "Requisição inválida.",
    );
    expect(() => parseBudgetCommand(null)).toThrow("Requisição inválida.");
    expect(() => parseBudgetCommand({ action: "logout" })).toThrow(
      "Requisição inválida.",
    );
  });
});

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

describe("parseDevLogin", () => {
  test("requires an email", () => {
    expect(parseDevLogin({ email: "ana@example.test" })).toEqual({
      email: "ana@example.test",
    });
    expect(() => parseDevLogin({})).toThrow("Requisição inválida.");
  });
});

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

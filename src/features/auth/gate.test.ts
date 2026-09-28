import { describe, expect, test } from "vitest";
import { isWorkspaceReady, legacyInviteToken } from "@/features/auth/gate";

describe("gate helpers", () => {
  test("the workspace needs both a named user and a household", () => {
    expect(isWorkspaceReady({ user: null, householdId: null })).toBe(false);
    expect(
      isWorkspaceReady({ user: { id: "a", name: "" }, householdId: "h" }),
    ).toBe(false);
    expect(
      isWorkspaceReady({ user: { id: "a", name: "Ana" }, householdId: null }),
    ).toBe(false);
    expect(
      isWorkspaceReady({ user: { id: "a", name: "Ana" }, householdId: "h" }),
    ).toBe(true);
  });

  test("reads the token from old ?convite= links only", () => {
    expect(legacyInviteToken("?month=2026-09&convite=abc")).toBe("abc");
    expect(legacyInviteToken("?month=2026-09")).toBeNull();
    expect(legacyInviteToken("")).toBeNull();
  });
});

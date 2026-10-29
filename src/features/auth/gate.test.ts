import { isRedirect } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import {
  guardWorkspace,
  isWorkspaceReady,
  legacyInviteToken,
} from "@/features/auth/gate";
import type { SessionState } from "@/features/auth/actions/load-session";

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

const ready: SessionState = {
  user: { id: "a", name: "Ana" },
  householdId: "h",
};

describe("workspace navigation guard", () => {
  test("a loaded budget does not wait on the session check", async () => {
    let release: (session: SessionState) => void = () => undefined;
    let left = false;

    const load = () =>
      new Promise<SessionState>((resolve) => {
        release = resolve;
      });

    await guardWorkspace("", true, load, () => {
      left = true;
    });

    expect(left).toBe(false);
    release({ user: null, householdId: null });
    await vi.waitFor(() => expect(left).toBe(true));
  });

  test("a failed session check keeps the loaded budget on screen", async () => {
    let left = false;

    await guardWorkspace(
      "",
      true,
      () => Promise.reject(new Error("offline")),
      () => {
        left = true;
      },
    );
    await Promise.resolve();

    expect(left).toBe(false);
  });

  test("an old invite link still leaves the workspace", async () => {
    const load = vi.fn<() => Promise<SessionState>>();

    try {
      await guardWorkspace("?convite=abc", true, load, () => undefined);
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);

      if (isRedirect(error)) {
        expect(error.options).toMatchObject({
          to: "/convite/$token",
          params: { token: "abc" },
          replace: true,
        });
      }
    }

    expect(load).not.toHaveBeenCalled();
  });

  test("the first visit still waits and sends a signed-out person to the landing page", async () => {
    try {
      await guardWorkspace(
        "",
        false,
        async () => ({ user: null, householdId: null }),
        () => undefined,
      );
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);

      if (isRedirect(error)) expect(error.options.to).toBe("/conheca");
    }
  });

  test("the first visit sends a signed-in person without a household to the gate", async () => {
    try {
      await guardWorkspace(
        "",
        false,
        async () => ({ user: { id: "u1", name: "Ana" }, householdId: null }),
        () => undefined,
      );
      expect.unreachable();
    } catch (error) {
      expect(isRedirect(error)).toBe(true);

      if (isRedirect(error)) expect(error.options.to).toBe("/entrar");
    }
  });

  test("the first visit with a ready session stays", async () => {
    await expect(
      guardWorkspace(
        "",
        false,
        async () => ready,
        () => undefined,
      ),
    ).resolves.toBeUndefined();
  });
});

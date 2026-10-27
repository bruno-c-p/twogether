import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ComponentControls } from "@clerk/shared/ui";

const calls: string[] = [];

const controls: ComponentControls = {
  mountComponent: ({ name }) => calls.push(`mount ${name}`),
  unmountComponent: () => calls.push("unmount"),
  updateProps: () => calls.push("updateProps"),
  openModal: (modal) => calls.push(`open ${modal}`),
  closeModal: (modal) => calls.push(`close ${modal}`),
  openDrawer: (drawer) => calls.push(`open ${drawer}`),
  closeDrawer: (drawer) => calls.push(`close ${drawer}`),
  prefetch: () => calls.push("prefetch"),
  mountImpersonationFab: () => calls.push("fab"),
};

// What Clerk's CDN script registers once it runs.
class FakeClerkUI {
  static version = "test";
  version = "test";

  ensureMounted() {
    return Promise.resolve(controls);
  }
}

const signIn = () => ({
  name: "SignIn",
  appearanceKey: "signIn",
  node: document.createElement("div"),
});

// A fresh module per test: the downloaded UI is cached module-wide.
async function lazyUI() {
  const { LazyClerkUI } = await import("@/lib/clerk-ui");

  return new LazyClerkUI(
    () => {
      throw new Error("The stand-in never reads Clerk itself.");
    },
    () => null,
    {},
    { import: () => Promise.resolve(undefined) },
  ).ensureMounted();
}

beforeEach(() => {
  vi.resetModules();
  calls.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.__internal_ClerkUICtor = undefined;
});

describe("LazyClerkUI", () => {
  test("waits for the first mount, then replays every call in order", async () => {
    const early = await lazyUI();

    early.updateProps({ options: {} });
    expect(calls).toEqual([]);

    globalThis.__internal_ClerkUICtor = FakeClerkUI;
    early.mountComponent(signIn());

    await vi.waitFor(() =>
      expect(calls).toEqual(["updateProps", "mount SignIn"]),
    );
    early.openModal("userProfile");
    expect(calls).toEqual(["updateProps", "mount SignIn", "open userProfile"]);
  });

  test("after a failed download it retries and mounts what still waits", async () => {
    vi.useFakeTimers();
    const reported = vi.spyOn(console, "error").mockReturnValue(undefined);
    const ui = await lazyUI();

    ui.mountComponent(signIn());
    ui.openModal("userProfile");
    await vi.advanceTimersByTimeAsync(20_000);

    expect(calls).toEqual([]);
    expect(reported).toHaveBeenCalled();

    globalThis.__internal_ClerkUICtor = FakeClerkUI;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(calls).toEqual(["mount SignIn"]);
  });

  test("a component that unmounts during the backoff stops the retries", async () => {
    vi.useFakeTimers();
    const reported = vi.spyOn(console, "error").mockReturnValue(undefined);
    const ui = await lazyUI();
    const form = signIn();

    ui.mountComponent(form);
    await vi.advanceTimersByTimeAsync(20_000);
    ui.unmountComponent({ node: form.node });
    const failures = reported.mock.calls.length;

    globalThis.__internal_ClerkUICtor = FakeClerkUI;
    await vi.advanceTimersByTimeAsync(120_000);

    expect(calls).toEqual([]);
    expect(reported.mock.calls.length).toBe(failures);
  });
});

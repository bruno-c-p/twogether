import { describe, expect, test } from "vitest";
import type { ComponentControls } from "@clerk/shared/ui";
import { LazyClerkUI } from "@/lib/clerk-ui";

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

describe("LazyClerkUI", () => {
  test("waits for the first mount, then replays every call in order", async () => {
    const ui = new LazyClerkUI(
      () => {
        throw new Error("The stand-in never reads Clerk itself.");
      },
      () => null,
      {},
      { import: () => Promise.resolve(undefined) },
    );

    const early = await ui.ensureMounted();

    early.updateProps({ options: {} });
    expect(calls).toEqual([]);

    globalThis.__internal_ClerkUICtor = FakeClerkUI;
    early.mountComponent({
      name: "SignIn",
      appearanceKey: "signIn",
      node: document.createElement("div"),
    });

    await expect.poll(() => calls).toEqual(["updateProps", "mount SignIn"]);
    (await ui.ensureMounted()).openModal("userProfile");
    expect(calls).toEqual(["updateProps", "mount SignIn", "open userProfile"]);
  });
});

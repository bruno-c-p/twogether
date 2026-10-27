import { loadClerkUIScript } from "@clerk/shared/loadClerkJsScript";
import type {
  ClerkUIConstructor,
  ClerkUIInstance,
  ComponentControls,
} from "@clerk/shared/ui";

type UIArgs = ConstructorParameters<ClerkUIConstructor>;

type UIProps = Parameters<ComponentControls["updateProps"]>[0];

declare global {
  var __internal_ClerkUICtor: ClerkUIConstructor | undefined;
}

let script: Promise<ClerkUIConstructor> | undefined;

// Clerk's prebuilt UI (sign-in form, profile modal) is about 270 KB from
// Clerk's CDN. Pages that show it start the download at once; elsewhere it
// waits for the first component Clerk opens.
export function preloadClerkUI() {
  if (script) return script;

  script = loadClerkUIScript({
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  }).then(() => {
    const ctor = globalThis.__internal_ClerkUICtor;

    if (!ctor) throw new Error("Clerk UI did not register.");

    return ctor;
  });
  // A failed download (a dropped connection) is retried on the next use.
  script.catch(() => {
    script = undefined;
  });

  return script;
}

// Stands in for Clerk's UI constructor (`ui.ClerkUI`). clerk-js reaches the
// UI only through `ensureMounted()` and the controls it returns, so the real
// UI downloads when a control mounts or opens something. Prop updates made
// before then replay onto it.
export const LazyClerkUI: ClerkUIConstructor = class implements ClerkUIInstance {
  static version = "";
  version = "";
  #args: UIArgs;
  #real: Promise<ComponentControls> | undefined;
  #props: UIProps[] = [];

  constructor(...args: UIArgs) {
    this.#args = args;
  }

  #load(preloadHint?: string) {
    if (this.#real) return this.#real;

    const real = preloadClerkUI()
      .then((Real) => new Real(...this.#args).ensureMounted({ preloadHint }))
      .then((controls) => {
        for (const props of this.#props) controls.updateProps(props);

        return controls;
      });

    this.#real = real;
    real.catch(() => {
      this.#real = undefined;
    });

    return real;
  }

  ensureMounted(opts?: { preloadHint?: string }) {
    if (opts?.preloadHint) void this.#load(opts.preloadHint);

    // Opening or mounting fetches the UI; closing or unmounting needs it only
    // if it already came.
    const now = (use: (controls: ComponentControls) => void) =>
      void this.#load().then(use);

    const later = (use: (controls: ComponentControls) => void) =>
      void this.#real?.then(use);

    const controls: ComponentControls = {
      updateProps: (props) => {
        if (this.#real) later((real) => real.updateProps(props));
        else this.#props.push(props);
      },
      mountComponent: (params) => now((real) => real.mountComponent(params)),
      unmountComponent: (params) =>
        later((real) => real.unmountComponent(params)),
      openModal: (modal, props) => now((real) => real.openModal(modal, props)),
      closeModal: (modal, options) =>
        later((real) => real.closeModal(modal, options)),
      openDrawer: (drawer, props) =>
        now((real) => real.openDrawer(drawer, props)),
      closeDrawer: (drawer, options) =>
        later((real) => real.closeDrawer(drawer, options)),
      prefetch: (component) => now((real) => real.prefetch(component)),
      mountImpersonationFab: () => now((real) => real.mountImpersonationFab()),
    };

    return Promise.resolve(controls);
  }
};

import { loadClerkUIScript } from "@clerk/shared/loadClerkJsScript";
import type {
  ClerkUIConstructor,
  ClerkUIInstance,
  ComponentControls,
} from "@clerk/shared/ui";
import { reportError } from "@/lib/errors";

type UIArgs = ConstructorParameters<ClerkUIConstructor>;

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
  // A failed download (a dropped connection) starts over on the next call.
  script.catch(() => {
    script = undefined;
  });

  return script;
}

type Operation = (controls: ComponentControls) => void;

const FIRST_RETRY_MS = 2_000;

const LAST_RETRY_MS = 60_000;

// Stands in for Clerk's UI constructor (`ui.ClerkUI`). clerk-js reaches the
// UI only through `ensureMounted()` and the controls it returns, so every
// call waits in one ordered queue and the real UI downloads once a control
// mounts or opens something. A failed download is reported and retried
// with backoff, then the queue replays in order, so a sign-in form mounted
// while offline still appears once the connection returns.
export const LazyClerkUI: ClerkUIConstructor = class implements ClerkUIInstance {
  static version = "";
  version = "";
  #args: UIArgs;
  #controls: ComponentControls | undefined;
  #queue: Operation[] = [];
  #loading = false;
  #retryMs = FIRST_RETRY_MS;

  constructor(...args: UIArgs) {
    this.#args = args;
  }

  #run(operation: Operation, load: boolean) {
    if (this.#controls) return operation(this.#controls);

    this.#queue.push(operation);

    if (load) this.#load();
  }

  #load(preloadHint?: string) {
    if (this.#loading || this.#controls) return;

    this.#loading = true;
    preloadClerkUI()
      .then((Real) => new Real(...this.#args).ensureMounted({ preloadHint }))
      .then(
        (controls) => {
          this.#controls = controls;

          for (const operation of this.#queue.splice(0)) operation(controls);
        },
        (error) => {
          reportError(error, { context: "Clerk UI download" });
          setTimeout(() => this.#load(preloadHint), this.#retryMs);
          this.#retryMs = Math.min(this.#retryMs * 2, LAST_RETRY_MS);
        },
      )
      .finally(() => {
        this.#loading = false;
      });
  }

  ensureMounted(opts?: { preloadHint?: string }) {
    if (opts?.preloadHint) this.#load(opts.preloadHint);

    // Mounting or opening fetches the UI; the rest only waits for it.
    const controls: ComponentControls = {
      updateProps: (props) => this.#run((ui) => ui.updateProps(props), false),
      mountComponent: (params) =>
        this.#run((ui) => ui.mountComponent(params), true),
      unmountComponent: (params) =>
        this.#run((ui) => ui.unmountComponent(params), false),
      openModal: (modal, props) =>
        this.#run((ui) => ui.openModal(modal, props), true),
      closeModal: (modal, options) =>
        this.#run((ui) => ui.closeModal(modal, options), false),
      openDrawer: (drawer, props) =>
        this.#run((ui) => ui.openDrawer(drawer, props), true),
      closeDrawer: (drawer, options) =>
        this.#run((ui) => ui.closeDrawer(drawer, options), false),
      prefetch: (component) => this.#run((ui) => ui.prefetch(component), true),
      mountImpersonationFab: () =>
        this.#run((ui) => ui.mountImpersonationFab(), true),
    };

    return Promise.resolve(controls);
  }
};

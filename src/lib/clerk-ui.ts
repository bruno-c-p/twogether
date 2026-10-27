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

// "wait" calls only need the UI if it comes; "mount" and "open" fetch it.
// An open is dropped when a download fails, so a modal asked for while
// offline does not pop up minutes later; a mounted form keeps waiting.
type Call = { operation: Operation; kind: "wait" | "mount" | "open" };

const FIRST_RETRY_MS = 2_000;

const MAX_ATTEMPTS = 6;

// Stands in for Clerk's UI constructor (`ui.ClerkUI`). clerk-js reaches the
// UI only through `ensureMounted()` and the controls it returns, so every
// call waits in one ordered queue and the real UI downloads once a control
// mounts or opens something. A failed download is reported and, while a
// mounted component still waits, retried with backoff (2 s doubling, six
// attempts; the next mount or open starts over). The queue then replays in
// order, so a sign-in form mounted while offline appears once the
// connection returns.
//
// The stand-in implements @clerk/shared's ClerkUIConstructor and
// ComponentControls; recheck it against them on every Clerk upgrade.
export const LazyClerkUI: ClerkUIConstructor = class implements ClerkUIInstance {
  static version = "";
  version = "";
  #args: UIArgs;
  #controls: ComponentControls | undefined;
  #queue: Call[] = [];
  #loading = false;
  #attempts = 0;
  #retry: ReturnType<typeof setTimeout> | undefined;

  constructor(...args: UIArgs) {
    this.#args = args;
  }

  #run(operation: Operation, kind: Call["kind"]) {
    if (this.#controls) return replay(this.#controls, operation);

    this.#queue.push({ operation, kind });

    if (kind !== "wait") this.#load();
  }

  #load(preloadHint?: string) {
    if (this.#loading || this.#controls) return;

    clearTimeout(this.#retry);
    this.#loading = true;
    preloadClerkUI()
      .then((Real) => new Real(...this.#args).ensureMounted({ preloadHint }))
      .then(
        (controls) => {
          this.#controls = controls;

          for (const { operation } of this.#queue.splice(0))
            replay(controls, operation);
        },
        (error) => {
          reportError(error, { context: "Clerk UI download" });
          this.#queue = this.#queue.filter((call) => call.kind !== "open");
          this.#attempts += 1;
          const waiting = this.#queue.some((call) => call.kind === "mount");

          if (waiting && this.#attempts < MAX_ATTEMPTS)
            this.#retry = setTimeout(
              () => this.#load(preloadHint),
              FIRST_RETRY_MS * 2 ** (this.#attempts - 1),
            );
          else this.#attempts = 0;
        },
      )
      .finally(() => {
        this.#loading = false;
      });
  }

  ensureMounted(opts?: { preloadHint?: string }) {
    if (opts?.preloadHint) this.#load(opts.preloadHint);

    const controls: ComponentControls = {
      updateProps: (props) => this.#run((ui) => ui.updateProps(props), "wait"),
      mountComponent: (params) =>
        this.#run((ui) => ui.mountComponent(params), "mount"),
      unmountComponent: (params) =>
        this.#run((ui) => ui.unmountComponent(params), "wait"),
      openModal: (modal, props) =>
        this.#run((ui) => ui.openModal(modal, props), "open"),
      closeModal: (modal, options) =>
        this.#run((ui) => ui.closeModal(modal, options), "wait"),
      openDrawer: (drawer, props) =>
        this.#run((ui) => ui.openDrawer(drawer, props), "open"),
      closeDrawer: (drawer, options) =>
        this.#run((ui) => ui.closeDrawer(drawer, options), "wait"),
      prefetch: (component) =>
        this.#run((ui) => ui.prefetch(component), "open"),
      mountImpersonationFab: () =>
        this.#run((ui) => ui.mountImpersonationFab(), "mount"),
    };

    return Promise.resolve(controls);
  }
};

// One failing call must not drop the calls queued after it.
function replay(controls: ComponentControls, operation: Operation) {
  try {
    operation(controls);
  } catch (error) {
    reportError(error, { context: "Clerk UI call" });
  }
}

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
// offline does not pop up minutes later; a mounted form keeps waiting until
// it unmounts.
type Call = {
  operation: Operation;
  kind: "wait" | "mount" | "open";
  node?: HTMLDivElement;
};

const FIRST_RETRY_MS = 2_000;

const LAST_RETRY_MS = 60_000;

// Stands in for Clerk's UI constructor (`ui.ClerkUI`). clerk-js reaches the
// UI only through `ensureMounted()` and the controls it returns, so every
// call waits in one ordered queue and the real UI downloads once a control
// mounts or opens something. A failed download is reported and, while a
// mounted component still waits, retried with backoff (2 s doubling up to
// 60 s). The queue then replays in order, so a sign-in form mounted while
// offline appears once the connection returns.
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

  #run(call: Call) {
    if (this.#controls) return call.operation(this.#controls);

    this.#queue.push(call);

    if (call.kind !== "wait") this.#load();
  }

  // A component that unmounts before the UI came no longer waits for it.
  #unmount(params: { node: HTMLDivElement }) {
    const queued = this.#queue.length;

    this.#queue = this.#queue.filter((call) => call.node !== params.node);

    if (this.#controls || this.#queue.length === queued)
      this.#run({
        operation: (ui) => ui.unmountComponent(params),
        kind: "wait",
      });
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

          if (this.#queue.some((call) => call.kind === "mount"))
            this.#retry = setTimeout(
              () => this.#load(preloadHint),
              Math.min(
                FIRST_RETRY_MS * 2 ** (this.#attempts - 1),
                LAST_RETRY_MS,
              ),
            );
        },
      )
      .finally(() => {
        this.#loading = false;
      });
  }

  ensureMounted(opts?: { preloadHint?: string }) {
    if (opts?.preloadHint) this.#load(opts.preloadHint);

    const wait = (operation: Operation) =>
      this.#run({ operation, kind: "wait" });

    const open = (operation: Operation) =>
      this.#run({ operation, kind: "open" });

    const controls: ComponentControls = {
      updateProps: (props) => wait((ui) => ui.updateProps(props)),
      mountComponent: (params) =>
        this.#run({
          operation: (ui) => ui.mountComponent(params),
          kind: "mount",
          node: params.node,
        }),
      unmountComponent: (params) => this.#unmount(params),
      openModal: (modal, props) => open((ui) => ui.openModal(modal, props)),
      closeModal: (modal, options) =>
        wait((ui) => ui.closeModal(modal, options)),
      openDrawer: (drawer, props) => open((ui) => ui.openDrawer(drawer, props)),
      closeDrawer: (drawer, options) =>
        wait((ui) => ui.closeDrawer(drawer, options)),
      prefetch: (component) => open((ui) => ui.prefetch(component)),
      mountImpersonationFab: () =>
        this.#run({
          operation: (ui) => ui.mountImpersonationFab(),
          kind: "mount",
        }),
    };

    return Promise.resolve(controls);
  }
};

// One failing queued call must not drop the calls queued after it.
function replay(controls: ComponentControls, operation: Operation) {
  try {
    operation(controls);
  } catch (error) {
    reportError(error, { context: "Clerk UI call" });
  }
}

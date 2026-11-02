import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no <dialog> modal API; mirror the open attribute so components
// that call showModal()/close() behave as they do in a browser.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };

  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
}

// jsdom has no matchMedia; report "no match" (light scheme, no preference).
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// jsdom has no Web Animations API; Glaze's toasts drain a timer line and
// glide with it. An animation that never runs is enough for the DOM tests.
if (!("animate" in Element.prototype)) {
  Object.defineProperties(Element.prototype, {
    animate: {
      value: () => ({
        playState: "idle",
        pause: () => undefined,
        play: () => undefined,
        cancel: () => undefined,
      }),
    },
    getAnimations: { value: () => [] },
  });
}

// jsdom has no layout, so nothing ever resizes; Glaze components that
// measure themselves (the segmented control's thumb) only need to observe.
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no scrolling; the test router's scroll restoration calls this.
window.scrollTo = () => undefined;

HTMLElement.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  cleanup();
});

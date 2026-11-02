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

// jsdom has no layout; Glaze's dialog, segmented control and pagination
// observe their size, which never changes here.
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no scrolling; the test router's scroll restoration calls this.
window.scrollTo = () => undefined;

HTMLElement.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  cleanup();
});

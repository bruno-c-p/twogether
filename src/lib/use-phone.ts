import { useSyncExternalStore } from "react";

// Matches the bp620 breakpoint's max- variant in uno.config.ts.
const PHONE_QUERY = "(max-width: 619.9px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(PHONE_QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

// True on phone-width screens. The server render assumes a wider screen.
export function usePhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

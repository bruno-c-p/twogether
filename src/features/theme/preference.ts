import { useSyncExternalStore } from "react";
import { z } from "zod/mini";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/features/theme/constants";

export const themePreferenceSchema = z.catch(
  z.enum(["system", "light", "dark"], { error: "Tema inválido." }),
  "system",
);

type Theme = z.infer<typeof themePreferenceSchema>;

function preference(): Theme {
  return themePreferenceSchema.parse(
    document.documentElement.dataset.themePreference,
  );
}

function applyTheme(theme: Theme, media: MediaQueryList) {
  const style = document.createElement("style");

  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  document.documentElement.dataset.theme =
    theme === "system" ? (media.matches ? "dark" : "light") : theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    // Glaze's tokens live on the .glaze body, not on <html>.
    getComputedStyle(document.body).getPropertyValue("--page").trim(),
  );
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute(
      "content",
      document.documentElement.dataset.theme === "dark"
        ? "black-translucent"
        : "default",
    );
  void document.body.offsetHeight;
  requestAnimationFrame(() => style.remove());
}

function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const sync = () => {
    applyTheme(preference(), media);
    notify();
  };

  const storage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.dataset.themePreference =
      themePreferenceSchema.parse(event.newValue);
    sync();
  };

  sync();
  media.addEventListener("change", sync);
  window.addEventListener(THEME_CHANGE_EVENT, sync);
  window.addEventListener("storage", storage);

  return () => {
    media.removeEventListener("change", sync);
    window.removeEventListener(THEME_CHANGE_EVENT, sync);
    window.removeEventListener("storage", storage);
  };
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, preference, (): Theme => "system");
}

export const themeScript = `(()=>{let t="system";try{const s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch{}const d=document.documentElement;d.dataset.themePreference=t;d.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.querySelector('meta[name="theme-color"]')?.setAttribute("content",getComputedStyle(d).getPropertyValue("--page").trim());document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute("content",d.dataset.theme==="dark"?"black-translucent":"default")})()`;

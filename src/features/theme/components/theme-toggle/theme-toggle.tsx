import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "@/features/theme/constants";
import styles from "@/features/theme/components/theme-toggle/theme-toggle.module.css";

const themePreferenceSchema = z
  .enum(["system", "light", "dark"], { error: "Tema inválido." })
  .catch("system");

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

export function ThemeToggle({ className }: { className?: string } = {}) {
  const theme = useSyncExternalStore(subscribe, preference, () => "system");

  return (
    <ToggleGroup
      className={
        className ? `${styles.themeToggle} ${className}` : styles.themeToggle
      }
      value={[theme]}
      onValueChange={(values) => {
        const next = values[0];

        if (!next) return;
        const value = themePreferenceSchema.parse(next);
        document.documentElement.dataset.themePreference = value;

        try {
          localStorage.setItem(THEME_STORAGE_KEY, value);
        } catch {
          /* Session-only when storage is unavailable. */
        }

        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      }}
      aria-label="Aparência"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <Toggle
          key={value}
          type="button"
          aria-label={`Tema ${label.toLowerCase()}`}
          value={value}
          title={
            value === "system"
              ? "Seguir tema do sistema"
              : `Tema ${label.toLowerCase()}`
          }
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export const themeScript = `(()=>{let t="system";try{const s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch{}const d=document.documentElement;d.dataset.themePreference=t;d.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t})()`;

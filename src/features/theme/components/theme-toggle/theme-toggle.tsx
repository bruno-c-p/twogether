import { useSyncExternalStore } from "react";
import {
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "@/features/theme/constants";
import styles from "@/features/theme/components/theme-toggle/theme-toggle.module.css";

type Theme = "system" | "light" | "dark";

function preference(): Theme {
  const value = document.documentElement.dataset.themePreference;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    const theme = preference();
    document.documentElement.dataset.theme =
      theme === "system" ? (media.matches ? "dark" : "light") : theme;
    notify();
  };
  const storage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.dataset.themePreference =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : "system";
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
    <div
      className={
        className ? `${styles.themeToggle} ${className}` : styles.themeToggle
      } role="group" aria-label="Aparência">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`Tema ${label.toLowerCase()}`}
          aria-pressed={theme === value}
          title={
            value === "system"
              ? "Seguir tema do sistema"
              : `Tema ${label.toLowerCase()}`
          }
          onClick={() => {
            document.documentElement.dataset.themePreference = value;
            try {
              localStorage.setItem(THEME_STORAGE_KEY, value);
            } catch {
              /* Session-only when storage is unavailable. */
            }
            window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
          }}
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export const themeScript = `(()=>{let t="system";try{const s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch{}const d=document.documentElement;d.dataset.themePreference=t;d.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t})()`;

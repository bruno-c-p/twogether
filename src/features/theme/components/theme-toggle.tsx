import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import styles from "@/features/theme/components/theme-toggle.module.css";

const storageKey = "twogether.theme.v1";
const changeEvent = "twogether:theme";
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
    if (event.key !== storageKey && event.key !== null) return;
    document.documentElement.dataset.themePreference =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : "system";
    sync();
  };
  sync();
  media.addEventListener("change", sync);
  window.addEventListener(changeEvent, sync);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", sync);
    window.removeEventListener(changeEvent, sync);
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
      {(
        [
          ["light", "Claro", Sun],
          ["dark", "Escuro", Moon],
          ["system", "Sistema", Monitor],
        ] as const
      ).map(([value, label, Icon]) => (
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
              localStorage.setItem(storageKey, value);
            } catch {
              /* Session-only when storage is unavailable. */
            }
            window.dispatchEvent(new Event(changeEvent));
          }}
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// Runs before the first paint; only validated preference values reach the DOM.
export const themeScript = `(()=>{let t="system";try{const s=localStorage.getItem("${storageKey}");if(s==="light"||s==="dark")t=s}catch{}const d=document.documentElement;d.dataset.themePreference=t;d.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t})()`;

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "@/features/theme/constants";
import {
  themePreferenceSchema,
  useThemePreference,
} from "@/features/theme/preference";
import styles from "@/features/theme/components/theme-toggle/theme-toggle.module.css";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const theme = useThemePreference();

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

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/glaze/ui/segmented-control";
import {
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "@/features/theme/constants";
import {
  themePreferenceSchema,
  useThemePreference,
} from "@/features/theme/preference";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const theme = useThemePreference();

  return (
    <SegmentedControl
      className={className}
      value={theme}
      onValueChange={(next) => {
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
      {THEME_OPTIONS.map(({ value, label }) => (
        <SegmentedControlItem
          key={value}
          value={value}
          aria-label={`Tema ${label.toLowerCase()}`}
        >
          {label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

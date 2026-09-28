import { Monitor, Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "twogether.theme.v1";

export const THEME_CHANGE_EVENT = "twogether:theme";

export const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, UsersRound } from "lucide-react";
import { ThemeToggle } from "@/features/theme";
import type { View } from "../types";
import { navigation } from "./app-navigation";

interface Props {
  view: View;
  hidden: boolean;
  memberLabel: string;
  onToggleHidden: () => void;
  onOpenCouple: () => void;
}

export function Topbar({
  view,
  hidden,
  memberLabel,
  onToggleHidden,
  onOpenCouple,
}: Props) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <strong>{navigation.find((item) => item.id === view)?.label}</strong>
      </div>
      <Link className="mobile-brand brand" to="/">
        <span className="brand-mark">
          <span />
          <span />
        </span>
        twogether.
      </Link>
      <div className="topbar-right">
        <ThemeToggle />
        <button
          className="icon-button visibility-button"
          onClick={onToggleHidden}
          aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
          title={hidden ? "Mostrar valores" : "Ocultar valores"}
        >
          {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
        <button
          className="space-button"
          aria-label={`Abrir nosso espaço: ${memberLabel}`}
          title={`Nosso espaço: ${memberLabel}`}
          onClick={onOpenCouple}
        >
          <UsersRound size={17} strokeWidth={1.8} aria-hidden="true" />
          <span className="space-button-label">Nosso espaço</span>
          <span className="space-member-count">{memberLabel}</span>
        </button>
      </div>
    </header>
  );
}

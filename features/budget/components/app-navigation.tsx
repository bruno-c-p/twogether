import { Link } from "@tanstack/react-router";
import { Landmark, LayoutGrid, ReceiptText, Target } from "lucide-react";
import type { View } from "../types";

export const navigation = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "goals", label: "Metas", icon: Target },
] satisfies { id: View; label: string; icon: typeof LayoutGrid }[];

interface Props {
  view: View;
  onNavigate: (view: View) => void;
}

export function AppNavigation({ view, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="twogether — início">
        <span className="brand-mark">
          <span />
          <span />
        </span>
        twogether<span className="brand-period">.</span>
      </Link>
      <nav className="desktop-navigation" aria-label="Navegação principal">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "nav-item active" : "nav-item"}
            aria-label={item.label}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon size={19} strokeWidth={1.7} />
            <span>{item.label}</span>
            {view === item.id && <span className="nav-active-dot" />}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNavigation({ view, onNavigate }: Props) {
  return (
    <nav className="mobile-navigation" aria-label="Navegação mobile">
      {navigation.map((item) => (
        <button
          key={item.id}
          className={view === item.id ? "active" : ""}
          aria-current={view === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <item.icon size={21} strokeWidth={1.7} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

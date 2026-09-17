import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import {
  Eye,
  EyeOff,
  Landmark,
  LayoutGrid,
  ReceiptText,
  Target,
  UsersRound,
} from "lucide-react";
import type { View } from "@/features/budget/types";
import { AppFooter } from "@/features/budget/components/app-footer";
import styles from "@/features/budget/components/budget-app.module.css";
import { withView } from "@/features/budget/search";
import { Brand } from "@/components/ui/brand/brand";
import { Button } from "@/components/ui/button/button";
import type { ReactNode } from "react";

const navigation = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "goals", label: "Metas", icon: Target },
] satisfies { id: View; label: string; icon: typeof LayoutGrid }[];

export function WorkspaceShell({
  view,
  memberLabel,
  hidden,
  onToggleHidden,
  onOpenCouple,
  children,
  overlays,
}: {
  view: View;
  memberLabel: string;
  hidden: boolean;
  onToggleHidden: () => void;
  onOpenCouple: () => void;
  children: ReactNode;
  overlays?: ReactNode;
}) {
  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Brand
          className={styles.sidebarBrand}
          mark
          aria-label="twogether — início"
        />
        <nav className={styles.desktopNavigation} aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link
              key={item.id}
              to="/"
              search={(prev) => withView(prev, item.id)}
              className={`${styles.navItem} ${view === item.id ? styles.active : ""}`}
              aria-label={item.label}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {view === item.id && <span className={styles.navActiveDot} />}
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.mainShell}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <strong>
              {navigation.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <Brand className={styles.mobileBrand} mark markClassName={styles.mobileMark}>
            twogether.
          </Brand>
          <div className={styles.topbarRight}>
            <ThemeToggle className={styles.topbarTheme} />
            <Button
              variant="icon"
              className={styles.visibilityButton}
              onClick={onToggleHidden}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </Button>
            <button
              className={styles.spaceButton}
              aria-label={`Abrir nosso espaço: ${memberLabel}`}
              title={`Nosso espaço: ${memberLabel}`}
              onClick={onOpenCouple}
            >
              <UsersRound size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.spaceButtonLabel}>Nosso espaço</span>
              <span className={styles.spaceMemberCount}>{memberLabel}</span>
            </button>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <AppFooter className={styles.shellFooter} />
      </div>
      <nav className={styles.mobileNavigation} aria-label="Navegação mobile">
        {navigation.map((item) => (
          <Link
            key={item.id}
            to="/"
            search={(prev) => withView(prev, item.id)}
            className={view === item.id ? styles.active : ""}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <item.icon size={21} strokeWidth={1.7} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {overlays}
    </div>
  );
}

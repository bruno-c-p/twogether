import { ThemeToggle } from "@/features/theme";
import { UserButton } from "@clerk/tanstack-react-start";
import { Eye, EyeOff, UsersRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { View } from "@/features/budget/domain/types";
import { WORKSPACE_NAVIGATION } from "@/features/budget/constants";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import { WorkspaceNavigation } from "@/features/budget/components/workspace-navigation/workspace-navigation";
import styles from "@/features/budget/components/workspace-shell/workspace-shell.module.css";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function WorkspaceShell({
  view,
  title,
  memberLabel,
  hidden,
  onToggleHidden,
  children,
  overlays,
}: {
  view?: View;
  title?: string;
  memberLabel: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
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
        <WorkspaceNavigation view={view} variant="desktop" />
      </aside>
      <div className={styles.mainShell}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <strong>
              {title ??
                WORKSPACE_NAVIGATION.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <Brand className={styles.mobileBrand} mark markClassName={styles.mobileMark}>
            twogether.
          </Brand>
          <div className={styles.topbarRight}>
            <ThemeToggle className={styles.topbarTheme} />
            {onToggleHidden && (
              <Button
                variant="icon"
                className={styles.visibilityButton}
                onClick={onToggleHidden}
                aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                title={hidden ? "Mostrar valores" : "Ocultar valores"}
              >
                {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
              </Button>
            )}
            <Link
              to="/conta"
              className={styles.spaceButton}
              aria-label={`Abrir nosso espaço: ${memberLabel}`}
              title={`Nosso espaço: ${memberLabel}`}
            >
              <UsersRound size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.spaceButtonLabel}>Nosso espaço</span>
              <span className={styles.spaceMemberCount}>{memberLabel}</span>
            </Link>
            <UserButton />
          </div>
        </header>
        <main id="main-content">{children}</main>
        <AppFooter className={styles.shellFooter} />
      </div>
      <WorkspaceNavigation view={view} variant="mobile" />
      {overlays}
    </div>
  );
}

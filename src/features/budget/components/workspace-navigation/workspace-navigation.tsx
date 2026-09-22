import { Link } from "@tanstack/react-router";
import type { View } from "@/features/budget/domain/types";
import { WORKSPACE_NAVIGATION } from "@/features/budget/constants";
import { withView } from "@/features/budget/search";
import styles from "@/features/budget/components/workspace-navigation/workspace-navigation.module.css";

export function WorkspaceNavigation({
  view,
  variant,
}: {
  view?: View;
  variant: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <nav className={styles.mobileNavigation} aria-label="Navegação mobile">
        {WORKSPACE_NAVIGATION.map((item) => (
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
    );
  }
  return (
    <nav className={styles.desktopNavigation} aria-label="Navegação principal">
      {WORKSPACE_NAVIGATION.map((item) => (
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
  );
}

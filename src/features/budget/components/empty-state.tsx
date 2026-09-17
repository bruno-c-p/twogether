import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "@/features/budget/components/empty-state.module.css";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>{icon}</div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function LoadingState({
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={styles.loading} aria-live="polite" {...props}>
      {children}
    </div>
  );
}

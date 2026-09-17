import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "@/ui/panel.module.css";

export function Panel({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={className ? `${styles.panel} ${className}` : styles.panel}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  titleId,
  count,
  description,
  children,
}: {
  title: ReactNode;
  titleId?: string;
  count?: number;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <h2 id={titleId}>
          {title}
          {count !== undefined ? (
            <span className={styles.count}>{count}</span>
          ) : null}
        </h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function OverviewGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={className ? `${styles.grid} ${className}` : styles.grid}
      {...props}
    />
  );
}

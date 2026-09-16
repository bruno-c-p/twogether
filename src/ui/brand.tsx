import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@tanstack/react-router";
import styles from "@/src/ui/brand.module.css";

export function Brand({
  className,
  mark = false,
  markClassName,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "to"> & {
  mark?: boolean;
  markClassName?: string;
}) {
  return (
    <Link
      to="/"
      className={className ? `${styles.brand} ${className}` : styles.brand}
      {...props}
    >
      {mark ? (
        <span
          className={
            markClassName ? `${styles.mark} ${markClassName}` : styles.mark
          }
        >
          <span />
          <span />
        </span>
      ) : null}
      {children ?? (
        <>
          twogether<span className={styles.period}>.</span>
        </>
      )}
    </Link>
  );
}

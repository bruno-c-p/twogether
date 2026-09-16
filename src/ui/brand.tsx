import type { ComponentPropsWithoutRef } from "react";
import styles from "@/src/ui/brand.module.css";

export function Brand({
  className,
  mark = false,
  markClassName,
  href = "/",
  children,
  ...props
}: ComponentPropsWithoutRef<"a"> & {
  mark?: boolean;
  markClassName?: string;
}) {
  return (
    <a
      className={className ? `${styles.brand} ${className}` : styles.brand}
      href={href}
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
    </a>
  );
}

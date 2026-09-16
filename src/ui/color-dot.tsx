import type { ComponentPropsWithoutRef } from "react";
import styles from "@/src/ui/color-dot.module.css";

export function ColorDot({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={className ? `${styles.dot} ${className}` : styles.dot}
      {...props}
    />
  );
}

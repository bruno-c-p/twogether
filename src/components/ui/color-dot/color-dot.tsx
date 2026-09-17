import type { ComponentPropsWithoutRef } from "react";
import styles from "@/components/ui/color-dot/color-dot.module.css";

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

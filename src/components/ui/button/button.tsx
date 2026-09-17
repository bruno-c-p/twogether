import type { ButtonHTMLAttributes } from "react";
import styles from "@/components/ui/button/button.module.css";

type Variant = "primary" | "secondary" | "text" | "icon" | "tag";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const classes = className
    ? `${variantClass(variant)} ${className}`
    : variantClass(variant);
  return <button className={classes} {...props} />;
}

function variantClass(variant: Variant) {
  switch (variant) {
    case "primary":
      return styles.primary;
    case "secondary":
      return styles.secondary;
    case "text":
      return styles.text;
    case "icon":
      return styles.icon;
    case "tag":
      return styles.tag;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

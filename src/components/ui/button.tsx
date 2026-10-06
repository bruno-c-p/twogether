import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "text" | "icon" | "tag";

const variants: Record<Variant, string> = {
  primary: cx(
    "inline-flex items-center justify-center gap-[8px]",
    "bg-brand text-on-brand border border-solid border-transparent",
    "px-[20px] py-[12px] rounded-md text-md font-600",
    "whitespace-nowrap min-h-[44px]",
    "hover:bg-brand-hover",
    "max-bp800:px-[16px]",
  ),
  secondary: cx(
    "border border-solid border-transparent rounded-md bg-surface-2",
    "px-[16px] py-[10px] text-sm font-600",
    "hover:bg-surface-3",
  ),
  text: cx(
    "border-0 bg-transparent inline-flex gap-[8px] items-center",
    "text-text-muted text-sm font-500 py-[8px] px-0",
    "hover:text-text",
  ),
  icon: cx(
    "w-[32px] h-[32px] inline-flex items-center justify-center shrink-0",
    "border-none bg-transparent p-0 rounded-md",
    "hover:bg-surface-2",
  ),
  tag: cx(
    "inline-flex items-center gap-[6px] px-[8px] py-[4px]",
    "border border-solid border-transparent rounded-sm bg-surface-2",
    "text-text-muted text-xs font-500",
  ),
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cx(variants[variant], className)} {...props} />;
}

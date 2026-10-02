import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "text" | "icon" | "tag";

const variants: Record<Variant, string> = {
  primary: cx(
    "inline-flex items-center justify-center gap-[9px]",
    "bg-green text-on-brand border border-solid border-green",
    "px-[19px] py-[13px] rounded-[7px] text-[12px] font-500",
    "whitespace-nowrap min-h-[43px]",
    "hover:bg-brand-hover",
    "bp1450:text-[14px]",
    "max-bp800:p-[12px]",
  ),
  secondary: cx(
    "border border-solid border-border rounded-[6px] bg-surface-soft",
    "px-[16px] py-[11px] text-[12px]",
  ),
  text: cx(
    "border-0 bg-transparent inline-flex gap-[7px] items-center",
    "text-text-muted text-[12px] py-[8px] px-0",
    "hover:text-text",
  ),
  icon: cx(
    "w-[32px] h-[32px] inline-flex items-center justify-center shrink-0",
    "border-none bg-transparent p-0 rounded-[6px]",
    "hover:bg-surface-soft",
  ),
  tag: cx(
    "inline-flex items-center gap-[6px] px-[9px] py-[5px]",
    "border border-solid border-border rounded-[5px] bg-surface-soft",
    "text-text-muted text-[12px]",
  ),
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cx(variants[variant], className)} {...props} />;
}

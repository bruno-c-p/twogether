import { Button as BaseButton } from "@base-ui/react/button";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "text" | "icon" | "tag" | "unstyled";

const variants: Record<Variant, string> = {
  unstyled: "",
  primary: cx(
    "inline-flex items-center justify-center gap-2",
    "bg-brand text-on-brand border border-solid border-transparent",
    "px-5 py-3 rounded-md text-md font-600",
    "whitespace-nowrap min-h-[44px]",
    "hover:bg-brand-hover",
    "max-bp800:px-4",
  ),
  secondary: cx(
    "border border-solid border-transparent rounded-md bg-surface-2",
    "px-4 py-2 text-sm font-600",
    "hover:bg-surface-3",
  ),
  text: cx(
    "border-0 bg-transparent inline-flex gap-2 items-center",
    "text-text-muted text-sm font-500 py-2 px-0",
    "hover:text-text",
  ),
  icon: cx(
    "w-[32px] h-[32px] inline-flex items-center justify-center shrink-0",
    "border-none bg-transparent p-0 rounded-md",
    "hover:bg-surface-2",
  ),
  tag: cx(
    "inline-flex items-center gap-1.5 px-2 py-1",
    "border border-solid border-transparent rounded-sm bg-surface-2",
    "text-text-muted text-xs font-500",
  ),
};

export function Button({
  variant = "primary",
  className,
  ...props
}: Omit<BaseButton.Props, "className"> & {
  variant?: Variant;
  className?: string;
}) {
  return <BaseButton className={cx(variants[variant], className)} {...props} />;
}

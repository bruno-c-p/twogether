import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/components/ui/cx";

export function ColorDot({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cx(
        "w-[6px] h-[6px] rounded-full inline-block shrink-0",
        className,
      )}
      {...props}
    />
  );
}

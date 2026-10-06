import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";

export function ColorDot({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cx(
        "w-[8px] h-[8px] rounded-full inline-block shrink-0",
        className,
      )}
      {...props}
    />
  );
}

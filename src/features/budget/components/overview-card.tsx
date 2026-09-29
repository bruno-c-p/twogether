import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";

export function OverviewCard({
  className,
  tone = "surface",
  ...props
}: ComponentPropsWithoutRef<"section"> & { tone?: "surface" | "balance" }) {
  return (
    <section
      className={cx(
        "border border-solid rounded-[16px] min-w-0",
        "p-[24px] max-bp620:p-[16px]",
        tone === "balance"
          ? "bg-balance text-on-balance border-balance-border"
          : "bg-surface border-border",
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function MobileTabContent({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={cx(
          "w-[56px] h-[30px] rounded-full inline-flex items-center justify-center",
          "motion-safe:transition-colors duration-150 ease-[var(--ease-out)]",
          active && "bg-hero text-on-hero",
        )}
      >
        {children}
      </span>
      <span
        className={cx(
          "whitespace-nowrap",
          active ? "font-700 text-text" : "text-text-muted",
        )}
      >
        {label}
      </span>
    </>
  );
}

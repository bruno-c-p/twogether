import type { ReactNode } from "react";
import { cn } from "@/lib/glaze/utils";

/** One slot of the phone tab bar, for the route links and the account tab. */
export const mobileTabClass = cn(
  "flex min-h-13 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-panel",
  "text-center type-label-sm select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]",
);

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
        className={cn(
          "inline-flex h-7.5 w-14 items-center justify-center rounded-pill",
          "transition-colors duration-(--dur-state) ease-out motion-reduce:transition-none",
          active ? "bg-pressed text-text-1" : "text-text-2",
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "whitespace-nowrap",
          active ? "text-text-1" : "text-text-2",
        )}
      >
        {label}
      </span>
    </>
  );
}

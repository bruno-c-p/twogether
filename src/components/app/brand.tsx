import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/glaze/utils";

export function Brand({
  className,
  mark = false,
  markClassName,
  textClassName,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "to" | "children"> & {
  mark?: boolean;
  markClassName?: string;
  textClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2 rounded-tag type-heading tracking-heading text-text-1",
        className,
      )}
      {...props}
    >
      {mark ? (
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-block h-6 w-5 shrink-0 -rotate-12",
            markClassName,
          )}
        >
          <MarkBar />
          <MarkBar second />
        </span>
      ) : null}
      {children ?? (
        <span className={textClassName}>
          twogether<span className="text-text-2">.</span>
        </span>
      )}
    </Link>
  );
}

// Two t's leaning on each other, drawn in ink.
function MarkBar({ second }: { second?: boolean }) {
  return (
    <span
      className={cn(
        "absolute h-5 w-1.5 bg-ink",
        second ? "top-0 left-3" : "top-1.5 left-0.5",
        "after:absolute after:top-1 after:-left-0.75 after:h-1 after:w-3 after:bg-ink after:content-['']",
      )}
    />
  );
}

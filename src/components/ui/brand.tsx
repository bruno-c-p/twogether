import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cx } from "@/lib/cx";

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
      className={cx(
        "flex items-center gap-2 font-heading text-2xl tracking-[-1.2px] font-800",
        "max-bp1190:text-2xl",
        className,
      )}
      {...props}
    >
      {mark ? (
        <span
          className={cx(
            "w-[26px] h-[31px] relative inline-block -rotate-12 shrink-0",
            markClassName,
          )}
        >
          <MarkBar />
          <MarkBar second />
        </span>
      ) : null}
      {children ?? (
        <>
          <span className={textClassName}>twogether</span>
          <span className={cx("text-text-muted -ml-2", textClassName)}>.</span>
        </>
      )}
    </Link>
  );
}

function MarkBar({ second }: { second?: boolean }) {
  return (
    <span
      className={cx(
        "absolute w-[8px] h-[24px] bg-brand",
        second ? "left-[16px] top-[1px]" : "left-[3px] top-[7px]",
        "rounded-t-sm rounded-b-sm",
        "after:content-[''] after:absolute after:top-[6px] after:left-[-4px]",
        "after:w-[16px] after:h-[6px] after:bg-brand",
      )}
    />
  );
}

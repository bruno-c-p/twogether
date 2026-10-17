import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/cx";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center flex-col text-center px-5 py-12 gap-3">
      <div className="w-[58px] h-[58px] rounded-lg bg-surface-soft grid place-items-center text-text-muted mb-1">
        {icon}
      </div>
      <h2 className="font-heading text-xl font-600">{title}</h2>
      {children ? (
        <p className="text-text-muted text-sm leading-[1.7] max-w-[410px]">
          {children}
        </p>
      ) : null}
      {action}
    </div>
  );
}

export function LoadingState({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-live="polite"
      className={cx(
        "min-h-[300px] grid place-items-center text-text-muted text-lg",
        className,
      )}
      {...props}
    />
  );
}

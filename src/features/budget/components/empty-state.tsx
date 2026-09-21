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
    <div className="flex items-center flex-col text-center px-[20px] py-[48px] gap-[12px]">
      <div className="w-[58px] h-[58px] rounded-[18px] bg-surface-soft grid place-items-center text-text-muted mb-[4px]">
        {icon}
      </div>
      <h3 className="font-heading text-[19px] font-550">{title}</h3>
      {children ? (
        <p className="text-text-muted text-[13px] leading-[1.7] max-w-[410px]">
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
        "min-h-[300px] grid place-items-center text-text-muted text-[16px]",
        className,
      )}
      {...props}
    />
  );
}

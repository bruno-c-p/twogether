import type { ReactNode } from "react";

export function PageHeading({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-[16px] flex-wrap mb-[22px]">
      <div className="min-w-0">
        <h1 className="text-[34px] max-bp620:text-[27px]">{title}</h1>
        {note && (
          <p className="text-text-muted text-[14px] mt-[6px] max-bp620:text-[12px]">
            {note}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

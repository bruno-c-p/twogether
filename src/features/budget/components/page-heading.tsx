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
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        <h1 className="text-3xl max-bp620:text-2xl">{title}</h1>
        {note && (
          <p className="text-text-muted text-md mt-1.5 max-bp620:text-xs">
            {note}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

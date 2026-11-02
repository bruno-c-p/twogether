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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="type-title tracking-heading">{title}</h1>
        {note && (
          <p className="mt-1.5 max-w-measure type-body text-text-2 max-sm:type-body-sm">
            {note}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

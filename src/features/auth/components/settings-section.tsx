import type { ReactNode } from "react";

// One group of the account sheet: a heading, a line on what it holds, then
// its controls.
export function SettingsSection({
  id,
  title,
  count,
  description,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="flex items-baseline gap-2 type-heading-sm">
          {title}
          {count !== undefined && (
            <span className="type-body-sm text-text-2 tabular-nums">
              {count}
            </span>
          )}
        </h3>
        <p className="type-body-sm text-text-2">{description}</p>
      </div>
      {children}
    </section>
  );
}

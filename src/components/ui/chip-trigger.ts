import { cx } from "@/lib/cx";

export const chipTrigger = cx(
  "inline-flex items-center gap-2 max-w-full cursor-pointer",
  "border border-solid border-transparent rounded-md bg-surface text-text",
  "px-3 py-2 text-sm font-600",
  "hover:bg-surface-2",
);

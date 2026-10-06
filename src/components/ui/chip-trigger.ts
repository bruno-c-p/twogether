import { cx } from "@/lib/cx";

export const chipTrigger = cx(
  "inline-flex items-center gap-[8px] max-w-full cursor-pointer",
  "border border-solid border-transparent rounded-md bg-surface text-text",
  "px-[12px] py-[8px] text-sm font-600",
  "hover:bg-surface-2",
);

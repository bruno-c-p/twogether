import { cn } from "@/lib/glaze/utils";

/** One slot of the phone tab bar, for the route links and the account tab. */
export const mobileTabClass = cn(
  "flex min-h-13 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-panel",
  "text-center type-label-sm select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]",
);

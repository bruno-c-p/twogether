import { Toaster as GlazeToaster } from "@/components/glaze/ui/toast";
import { cn } from "@/lib/glaze/utils";

// Below lg the phone tab bar covers the bottom edge and already clears the
// home indicator, so the stack sits on top of it. From sm Glaze drops the
// stack's padding and pins it 24px up, so that range needs its own offset.
export function AppToaster() {
  return (
    <GlazeToaster
      className={cn(
        "max-lg:bottom-(--mobile-nav-height) max-lg:pb-4",
        "sm:max-lg:bottom-[calc(var(--mobile-nav-height)+var(--space-4))]",
      )}
    />
  );
}

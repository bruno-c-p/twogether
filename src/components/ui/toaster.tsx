import { Toaster as GlazeToaster } from "@/components/glaze/ui/toast";

// Below lg the phone tab bar covers the bottom edge and already clears the
// home indicator, so the stack sits on top of it.
export function Toaster() {
  return (
    <GlazeToaster className="max-lg:bottom-(--mobile-nav-height) max-lg:pb-4" />
  );
}

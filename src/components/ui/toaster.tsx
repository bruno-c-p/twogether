import { Toaster as SonnerToaster } from "sonner";
import { useThemePreference } from "@/features/theme";

const bottom =
  "calc(24px + var(--navigation-clearance) + env(safe-area-inset-bottom))";

export function Toaster() {
  const theme = useThemePreference();

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      closeButton
      duration={8000}
      containerAriaLabel="Avisos"
      style={{ fontFamily: "inherit" }}
      className="[--navigation-clearance:0px] max-bp1000:[--navigation-clearance:80px]"
      offset={{ bottom }}
      mobileOffset={{ bottom, left: 16, right: 16 }}
      toastOptions={{ closeButtonAriaLabel: "Fechar aviso" }}
    />
  );
}

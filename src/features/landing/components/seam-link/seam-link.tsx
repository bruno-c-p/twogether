import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { Button } from "@/components/glaze/ui/button";
import { Icon, ArrowRight } from "@/components/glaze/icon";

// The landing page's call to action, a link drawn as a Glaze button: the
// primary one leads with the arrow, the secondary one is the quiet way in.
export function SeamLink({
  to,
  variant = "solid",
  children,
}: {
  to: LinkProps["to"];
  variant?: "solid" | "outline";
  children: ReactNode;
}) {
  return (
    <Button
      render={<Link to={to} />}
      nativeButton={false}
      variant={variant === "solid" ? "primary" : "secondary"}
      size={variant === "solid" ? "lg" : "default"}
    >
      {children}
      {variant === "solid" ? <Icon icon={ArrowRight} /> : null}
    </Button>
  );
}

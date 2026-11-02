import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { buttonVariants } from "@/components/glaze/ui/button";
import { Icon, ArrowRight } from "@/components/glaze/icon";

// The landing page's call to action, a real link drawn as a Glaze button: the
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
    <Link
      to={to}
      className={buttonVariants({
        variant: variant === "solid" ? "primary" : "secondary",
        size: variant === "solid" ? "lg" : "default",
      })}
    >
      {children}
      {variant === "solid" ? <Icon icon={ArrowRight} /> : null}
    </Link>
  );
}

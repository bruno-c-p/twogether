import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "@/features/landing/components/seam-link/seam-link.module.css";

// The landing page's call to action. The page tears things apart; its links
// do the reverse: two halves of ink close from the edges and meet at the seam.
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
    <Link to={to} className={cx(styles.link, styles[variant])}>
      {children}
      {variant === "solid" ? (
        <ArrowRight className={styles.arrow} size={18} aria-hidden="true" />
      ) : null}
    </Link>
  );
}

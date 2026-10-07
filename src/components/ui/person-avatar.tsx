import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/** Members keep one color by join order: the first is lime, the second ink. */
export function PersonAvatar({
  name,
  position,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: string | undefined;
  position: number;
}) {
  return (
    <span
      className={cx(
        "rounded-full inline-flex items-center justify-center shrink-0 font-700",
        position === -1 && "bg-surface-2 text-text-muted",
        position === 0 &&
          "bg-person-a text-on-person-a shadow-[inset_0_0_0_2px_var(--on-person-a)]",
        position > 0 && "bg-person-b text-on-person-b",
        className,
      )}
      {...props}
    >
      {position === -1
        ? "?"
        : graphemes
            .segment(name?.trim() ?? "")
            [Symbol.iterator]()
            .next()
            .value?.segment.toLocaleUpperCase("pt-BR") || "?"}
    </span>
  );
}

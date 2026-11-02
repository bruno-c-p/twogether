import type { ComponentPropsWithoutRef } from "react";
import {
  Avatar,
  AvatarFallback,
  type AvatarSize,
} from "@/components/glaze/ui/avatar";

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

function initialOf(name: string | undefined) {
  return (
    graphemes
      .segment(name?.trim() ?? "")
      [Symbol.iterator]()
      .next()
      .value?.segment.toLocaleUpperCase("pt-BR") || "?"
  );
}

/** A member's initial; position -1 is someone outside the household. */
export function PersonAvatar({
  name,
  position,
  size,
  ...props
}: Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: string | undefined;
  position: number;
  size?: AvatarSize;
}) {
  return (
    <Avatar size={size} {...props}>
      <AvatarFallback>{position === -1 ? "?" : initialOf(name)}</AvatarFallback>
    </Avatar>
  );
}

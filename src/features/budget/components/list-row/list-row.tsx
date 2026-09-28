import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from "react";
import styles from "@/features/budget/components/list-row/list-row.module.css";

export function ListRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={className ? `${styles.row} ${className}` : styles.row}
      {...props}
    />
  );
}

export function ListRowIcon({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={className ? `${styles.icon} ${className}` : styles.icon}
      {...props}
    />
  );
}

export function ListRowName({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={className ? `${styles.name} ${className}` : styles.name}
      {...props}
    />
  );
}

export function ListRowMeta({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={className ? `${styles.meta} ${className}` : styles.meta}
      {...props}
    />
  );
}

export function ListRowValue({
  tone = "positive",
  className,
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: "positive" | "negative" }) {
  const toneClass = valueTone(tone);

  return (
    <span
      className={
        className
          ? `${styles.value} ${toneClass} ${className}`
          : `${styles.value} ${toneClass}`
      }
      {...props}
    />
  );
}

export function ListRowActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={className ? `${styles.actions} ${className}` : styles.actions}
      {...props}
    />
  );
}

export const listRowAction = styles.actionButton;

export const listRowDelete = styles.deleteButton;

function valueTone(tone: "positive" | "negative") {
  switch (tone) {
    case "positive":
      return styles.positive;
    case "negative":
      return styles.negative;
    default: {
      const _exhaustive: never = tone;

      return _exhaustive;
    }
  }
}

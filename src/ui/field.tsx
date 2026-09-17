import type {
  ComponentPropsWithoutRef,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import styles from "@/ui/field.module.css";

export function Field({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={className ? `${styles.field} ${className}` : styles.field}
      {...props}
    />
  );
}

export function FieldRow({
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

export function AmountField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <>
      <label className={styles.amountLabel} htmlFor={htmlFor}>
        {label}
      </label>
      <div className={styles.amount}>
        <span>R$</span>
        {children}
      </div>
    </>
  );
}

export function Fieldset({
  className,
  ...props
}: ComponentPropsWithoutRef<"fieldset">) {
  return (
    <fieldset
      className={className ? `${styles.fields} ${className}` : styles.fields}
      {...props}
    />
  );
}

export function FormStack({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={className ? `${styles.stack} ${className}` : styles.stack}
      {...props}
    />
  );
}

export function Form({
  className,
  ...props
}: ComponentPropsWithoutRef<"form">) {
  return (
    <form
      className={className ? `${styles.stack} ${className}` : styles.stack}
      {...props}
    />
  );
}

export function FormError({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      role="alert"
      className={className ? `${styles.error} ${className}` : styles.error}
      {...props}
    />
  );
}

export function FieldHint({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={className ? `${styles.hint} ${className}` : styles.hint}
      {...props}
    />
  );
}

export function Optional({ children }: { children: ReactNode }) {
  return <span className={styles.optional}>{children}</span>;
}

export function Note({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={className ? `${styles.note} ${className}` : styles.note}
      {...props}
    />
  );
}

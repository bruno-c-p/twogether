import { Field as BaseField } from "@base-ui/react/field";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { Form as BaseForm } from "@base-ui/react/form";
import type {
  ComponentPropsWithoutRef,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import styles from "@/components/ui/field/field.module.css";

export function Field({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <BaseField.Root
      className={className ? `${styles.field} ${className}` : styles.field}
    >
      <BaseField.Label {...props} />
    </BaseField.Root>
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
      <BaseField.Label className={styles.amountLabel} htmlFor={htmlFor}>
        {label}
      </BaseField.Label>
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
    <BaseFieldset.Root
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
    <BaseForm
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

export function FieldError({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  if (!children) return null;

  return (
    <BaseField.Error
      match
      render={<span />}
      role="alert"
      className={
        className ? `${styles.fieldError} ${className}` : styles.fieldError
      }
      {...props}
    >
      {children}
    </BaseField.Error>
  );
}

// The error of a choice group (buttons, not a form control), which has no
// Field.Root to report to.
export function GroupError({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className={
        className ? `${styles.fieldError} ${className}` : styles.fieldError
      }
      {...props}
    >
      {children}
    </p>
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

export function Note({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={className ? `${styles.note} ${className}` : styles.note}
      {...props}
    />
  );
}

export const FieldRoot = BaseField.Root;

export const FieldLabel = BaseField.Label;

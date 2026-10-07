import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Form as BaseForm } from "@base-ui/react/form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import styles from "@/components/ui/dialog/dialog.module.css";

type DialogName =
  { labelledBy: string; label?: never } | { label: string; labelledBy?: never };

export function Dialog({
  children,
  className,
  narrow,
  labelledBy,
  label,
  onClose,
  closeOnBackdrop = false,
  dismissDisabled = false,
  initialFocus,
}: DialogName & {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  dismissDisabled?: boolean;
  initialFocus?: BaseDialog.Popup.Props["initialFocus"];
}) {
  const [open, setOpen] = useState(true);
  const popup = useRef<HTMLDivElement>(null);

  return (
    <BaseDialog.Root
      open={open}
      disablePointerDismissal={!closeOnBackdrop}
      onOpenChange={(next, details) => {
        if (!next && dismissDisabled) {
          details.cancel();

          return;
        }

        setOpen(next);
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClose();
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          data-slot="dialog-backdrop"
          className={styles.backdrop}
        />
        <BaseDialog.Popup
          ref={popup}
          className={cx(styles.dialog, narrow && styles.narrow, className)}
          aria-labelledby={labelledBy}
          aria-label={label}
          initialFocus={
            initialFocus ??
            (() =>
              popup.current?.querySelector<HTMLElement>(
                "[data-initial-focus]",
              ) ?? true)
          }
        >
          <div className={styles.grabber} aria-hidden="true" />
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function DialogDismiss({
  children,
  autoFocus,
}: {
  children: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <BaseDialog.Close
      render={<Button type="button" variant="text" />}
      data-initial-focus={autoFocus ? "" : undefined}
    >
      {children}
    </BaseDialog.Close>
  );
}

export function DialogContent({
  as = "div",
  className,
  ...props
}: {
  as?: "div" | "form";
} & ComponentPropsWithoutRef<"div"> &
  ComponentPropsWithoutRef<"form">) {
  const classes = className ? `${styles.content} ${className}` : styles.content;

  switch (as) {
    case "form":
      return <BaseForm className={classes} {...props} />;
    case "div":
      return <div className={classes} {...props} />;
    default: {
      const _exhaustive: never = as;

      return _exhaustive;
    }
  }
}

export function DialogHeader({
  children,
  closeLabel = "Fechar",
  closeDisabled,
}: {
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
}) {
  return (
    <header className={styles.header}>
      {children}
      <BaseDialog.Close
        render={<Button variant="icon" />}
        type="button"
        aria-label={closeLabel}
        disabled={closeDisabled}
      >
        <X size={22} />
      </BaseDialog.Close>
    </header>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={className ? `${styles.footer} ${className}` : styles.footer}
    >
      {children}
    </footer>
  );
}

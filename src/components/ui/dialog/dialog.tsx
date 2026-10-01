import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "@/components/ui/dialog/dialog.module.css";

// A dialog is named by a visible heading (labelledBy) or, without one, by
// a label.
type DialogName =
  { labelledBy: string; label?: never } | { label: string; labelledBy?: never };

export function Dialog({
  children,
  className,
  narrow,
  unstyled = false,
  labelledBy,
  label,
  onClose,
  closeOnBackdrop = false,
  onCancel,
}: DialogName & {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  // Skips the module's box styles so className can lay the dialog out
  // from scratch; the modal behavior stays the same.
  unstyled?: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  onCancel?: (event: SyntheticEvent<HTMLDialogElement>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      element?.close();
      document.body.style.overflow = overflow;

      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const classes = [
    unstyled ? "" : styles.dialog,
    narrow && !unstyled ? styles.narrow : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dialog
      ref={dialog}
      className={classes}
      aria-labelledby={labelledBy}
      aria-label={label}
      onCancel={(event) => {
        if (onCancel) {
          onCancel(event);

          return;
        }

        onClose();
      }}
      onClick={
        closeOnBackdrop
          ? (event) => {
              if (event.target === event.currentTarget) onClose();
            }
          : undefined
      }
    >
      {children}
    </dialog>
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
      return <form className={classes} {...props} />;
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
  onClose,
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
      <Button
        type="button"
        variant="icon"
        aria-label={closeLabel}
        disabled={closeDisabled}
        onClick={onClose}
      >
        <X size={22} />
      </Button>
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

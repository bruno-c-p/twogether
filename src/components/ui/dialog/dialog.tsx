import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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

const DialogCloseContext = createContext<(() => void) | null>(null);

// onClose unmounts the dialog, so the exit transition has to finish first.
// A zero computed duration (reduced motion, unstyled, jsdom) closes now.
function transitionMs(element: HTMLElement): number {
  const raw =
    getComputedStyle(element).transitionDuration.split(",")[0]?.trim() ?? "";

  const value = Number.parseFloat(raw);

  if (!Number.isFinite(value) || value <= 0) return 0;

  return raw.endsWith("ms") ? value : value * 1000;
}

function watchClose(element: HTMLElement, finish: () => void) {
  let finished = false;

  const done = () => {
    if (finished) return;

    finished = true;
    finish();
  };

  const onEnd = (event: TransitionEvent) => {
    if (event.target !== element || event.propertyName !== "transform") return;

    done();
  };

  element.addEventListener("transitionend", onEnd);
  const timer = setTimeout(done, transitionMs(element) + 40);

  return () => {
    finished = true;
    clearTimeout(timer);
    element.removeEventListener("transitionend", onEnd);
  };
}

function useDialogClose(onClose: () => void) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    const element = dialog.current;

    if (!element || closingRef.current) return;

    if (transitionMs(element) === 0) {
      onCloseRef.current();

      return;
    }

    closingRef.current = true;
    setClosing(true);
  }, []);

  useLayoutEffect(() => {
    const element = dialog.current;

    if (!closing || !element) return;

    return watchClose(element, () => onCloseRef.current());
  }, [closing]);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;

    element?.showModal();
    // showModal moves focus onto the dialog after React's autoFocus, which
    // never writes the autofocus attribute. A marked control is the one
    // that should end up focused (the least destructive action).
    element?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      element?.close();
      document.body.style.overflow = overflow;

      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return { dialog, closing, requestClose };
}

function dialogClassName(
  unstyled: boolean,
  narrow: boolean | undefined,
  closing: boolean,
  className: string | undefined,
) {
  return [
    unstyled ? "" : styles.dialog,
    narrow && !unstyled ? styles.narrow : "",
    closing && !unstyled ? styles.closing : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

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
  const { dialog, closing, requestClose } = useDialogClose(onClose);
  const classes = dialogClassName(unstyled, narrow, closing, className);

  return (
    <DialogCloseContext.Provider value={requestClose}>
      <dialog
        ref={dialog}
        className={classes}
        aria-labelledby={labelledBy}
        aria-label={label}
        onCancel={(event) => {
          onCancel?.(event);

          if (event.defaultPrevented) return;

          event.preventDefault();
          requestClose();
        }}
        onClick={
          closeOnBackdrop
            ? (event) => {
                if (event.target === event.currentTarget) requestClose();
              }
            : undefined
        }
      >
        {!unstyled && <div className={styles.grabber} aria-hidden="true" />}
        {children}
      </dialog>
    </DialogCloseContext.Provider>
  );
}

export function DialogDismiss({
  children,
  autoFocus,
}: {
  children: ReactNode;
  autoFocus?: boolean;
}) {
  const requestClose = useContext(DialogCloseContext);

  return (
    <Button
      type="button"
      variant="text"
      autoFocus={autoFocus}
      data-initial-focus={autoFocus ? "" : undefined}
      onClick={() => requestClose?.()}
    >
      {children}
    </Button>
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
  const requestClose = useContext(DialogCloseContext);

  return (
    <header className={styles.header}>
      {children}
      <Button
        type="button"
        variant="icon"
        aria-label={closeLabel}
        disabled={closeDisabled}
        onClick={requestClose ?? onClose}
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

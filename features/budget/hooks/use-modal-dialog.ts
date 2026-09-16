import { useEffect, type RefObject } from "react";

export function useModalDialog(dialog: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [dialog]);
}

export function useCaretToEnd(
  input: RefObject<HTMLInputElement | null>,
  value: string,
) {
  useEffect(() => {
    const element = input.current;
    if (element)
      element.setSelectionRange(element.value.length, element.value.length);
  }, [input, value]);
}

import { useEffect, useRef } from "react";
import type { Transaction } from "../types";

interface Props {
  transaction: Transaction;
  count: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onDelete: (following: boolean) => Promise<void>;
}

export function DeleteRecurrenceDialog({
  transaction,
  count,
  busy,
  error,
  onClose,
  onDelete,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-content">
        <h2 id="delete-title">Excluir transação recorrente</h2>
        <p>{transaction.description}</p>
        <p>
          As ocorrências anteriores serão mantidas. A exclusão em conjunto não
          pode ser desfeita.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <fieldset className="transaction-fields" disabled={busy}>
          <footer className="dialog-footer" style={{ flexWrap: "wrap" }}>
            <button type="button" className="text-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => void onDelete(false)}
            >
              Só esta
            </button>
            {count > 1 && (
              <button
                type="button"
                className="primary-button"
                onClick={() => void onDelete(true)}
              >
                {busy ? "Excluindo…" : `Esta e as seguintes (${count})`}
              </button>
            )}
          </footer>
        </fieldset>
      </div>
    </dialog>
  );
}

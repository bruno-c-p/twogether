import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import type { Transaction } from "@/features/budget/types";
import ui from "@/src/ui.module.css";
import styles from "@/features/budget/components/delete-recurrence-dialog.module.css";

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
  const [following, setFollowing] = useState(false);
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
  return (
    <dialog
      ref={dialog}
      className={`${ui.dialog} ${styles.deleteDialog}`}
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={ui.dialogContent}>
        <header className={ui.dialogHeader}>
          <h2 id="delete-title">Excluir transação</h2>
          <button
            type="button"
            className={ui.iconButton}
            aria-label="Fechar"
            disabled={busy}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        <p className={styles.deleteDescription}>{transaction.description}</p>
        <fieldset className={ui.transactionFields} disabled={busy}>
          <fieldset className={styles.deleteOptions}>
            <legend>O que você deseja excluir?</legend>
            <label
              className={`${styles.deleteOption} ${!following ? styles.isSelected : ""}`}
            >
              <input
                type="radio"
                name="delete-scope"
                checked={!following}
                onChange={() => setFollowing(false)}
              />
              <span>
                <strong>Só esta transação</strong>
                <small>As outras ocorrências serão mantidas.</small>
              </span>
            </label>
            {count > 1 && (
              <label
                className={`${styles.deleteOption} ${following ? styles.isSelected : ""}`}
              >
                <input
                  type="radio"
                  name="delete-scope"
                  checked={following}
                  onChange={() => setFollowing(true)}
                />
                <span>
                  <strong>Esta e as seguintes</strong>
                  <small>{count} transações desta recorrência.</small>
                </span>
              </label>
            )}
          </fieldset>
          {following && (
            <p className={styles.deleteWarning}>
              As anteriores serão mantidas. Esta exclusão não pode ser desfeita.
            </p>
          )}
          {error && (
            <p role="alert" className={ui.formError}>
              {error}
            </p>
          )}
          <footer className={ui.dialogFooter}>
            <button type="button" className={ui.textButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className={`${ui.primaryButton} ${styles.deleteConfirm}`}
              onClick={() => void onDelete(following)}
            >
              <Trash2 size={16} />
              {busy
                ? "Excluindo…"
                : following
                  ? `Excluir ${count} transações`
                  : "Excluir transação"}
            </button>
          </footer>
        </fieldset>
      </div>
    </dialog>
  );
}

import { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useModalDialog } from "../hooks/use-modal-dialog";
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
  const [following, setFollowing] = useState(false);
  useModalDialog(dialog);
  return (
    <dialog
      ref={dialog}
      className="transaction-dialog delete-dialog"
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <h2 id="delete-title">Excluir transação</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar"
            disabled={busy}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        <p className="delete-description">{transaction.description}</p>
        <fieldset className="transaction-fields" disabled={busy}>
          <fieldset className="delete-options">
            <legend>O que você deseja excluir?</legend>
            <label
              className={`delete-option ${!following ? "is-selected" : ""}`}
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
                className={`delete-option ${following ? "is-selected" : ""}`}
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
            <p className="delete-warning">
              As anteriores serão mantidas. Esta exclusão não pode ser desfeita.
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <footer className="dialog-footer">
            <button type="button" className="text-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button delete-confirm"
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

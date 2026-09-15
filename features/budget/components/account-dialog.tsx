import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { BankAccount } from "../types";

interface Props {
  account: BankAccount | null;
  serverError: string;
  onSave: (account: BankAccount) => Promise<boolean>;
  onClose: () => void;
}

export function AccountDialog({
  account,
  serverError,
  onSave,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = "";
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    if (!name) {
      setError("Dê um nome para esta conta.");
      return;
    }
    setSaving(true);
    setError("");
    if (
      await onSave({
        id: account?.id ?? crypto.randomUUID(),
        name,
        revision: account?.revision,
      })
    )
      onClose();
    setSaving(false);
  }

  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="account-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <div>
            <h2 id="account-dialog-title">
              {account ? "Editar conta" : "Nova conta"}
            </h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        <form onSubmit={submit}>
          <fieldset className="transaction-fields" disabled={saving}>
            <label className="account-field">
              Nome da conta
              <input
                name="name"
                autoFocus
                placeholder="Ex.: Nubank, Itaú, carteira"
                maxLength={50}
                defaultValue={account?.name}
                required
              />
            </label>
            {error && (
              <p id="form-error" role="alert" className="form-error">
                {error}
              </p>
            )}
            {serverError && (
              <p role="alert" className="form-error">
                {serverError}
              </p>
            )}
            <footer className="dialog-footer">
              <button type="button" className="text-button" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                <Check size={17} />
                {saving
                  ? "Salvando…"
                  : account
                    ? "Salvar alterações"
                    : "Adicionar conta"}
              </button>
            </footer>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}

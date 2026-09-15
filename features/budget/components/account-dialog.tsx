import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { formatAmountInput, parseBalance } from "../services/budget";
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
  const amountInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openingValue, setOpeningValue] = useState(
    account ? formatAmountInput(String(account.openingBalance)) : "",
  );

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

  useEffect(() => {
    const input = amountInput.current;
    if (!input) return;
    input.setSelectionRange(input.value.length, input.value.length);
  }, [openingValue]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    const openingBalance = parseBalance(openingValue);
    if (!name) {
      setError("Dê um nome para esta conta.");
      return;
    }
    if (openingBalance === null) {
      setError("Digite um saldo inicial válido, como 0,00 ou 1.250,00.");
      return;
    }
    setSaving(true);
    setError("");
    if (
      await onSave({
        id: account?.id ?? crypto.randomUUID(),
        name,
        openingBalance,
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
            <label className="amount-label" htmlFor="opening-balance">
              Saldo inicial
            </label>
            <div className="amount-input">
              <span>R$</span>
              <input
                id="opening-balance"
                ref={amountInput}
                name="openingBalance"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                maxLength={14}
                required
                value={openingValue}
                onChange={(event) =>
                  setOpeningValue(formatAmountInput(event.currentTarget.value))
                }
                aria-describedby={error ? "form-error" : undefined}
              />
            </div>
            <p className="account-footnote">
              O saldo da conta soma este valor com as receitas e subtrai as
              despesas.
            </p>
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

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import chrome from "@/src/chrome.module.css";
import { formatAmountInput, parseBalance } from "@/features/budget/services/budget";
import type { BankAccount } from "@/features/budget/types";

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
      className={chrome.dialog}
      aria-labelledby="account-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={chrome.dialogContent}>
        <header className={chrome.dialogHeader}>
          <div>
            <h2 id="account-dialog-title">
              {account ? "Editar conta" : "Nova conta"}
            </h2>
          </div>
          <button className={chrome.iconButton} aria-label="Fechar" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        <form onSubmit={submit}>
          <fieldset className={chrome.transactionFields} disabled={saving}>
            <label className={chrome.accountField}>
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
            <label className={chrome.amountLabel} htmlFor="opening-balance">
              Saldo inicial
            </label>
            <div className={chrome.amountInput}>
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
            <p className={chrome.accountFootnote}>
              O saldo da conta soma este valor com as receitas e subtrai as
              despesas.
            </p>
            {error && (
              <p id="form-error" role="alert" className={chrome.formError}>
                {error}
              </p>
            )}
            {serverError && (
              <p role="alert" className={chrome.formError}>
                {serverError}
              </p>
            )}
            <footer className={chrome.dialogFooter}>
              <button type="button" className={chrome.textButton} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className={chrome.primaryButton}>
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

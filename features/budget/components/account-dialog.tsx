import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/src/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/src/ui/dialog";
import {
  AmountField,
  Field,
  FieldHint,
  Fieldset,
  FormError,
} from "@/src/ui/field";
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
  const amountInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openingValue, setOpeningValue] = useState(
    account ? formatAmountInput(String(account.openingBalance)) : "",
  );

  useEffect(() => {
    const input = amountInput.current;
    if (!input) return;
    input.setSelectionRange(input.value.length, input.value.length);
  }, [openingValue]);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    <Dialog
      labelledBy="account-dialog-title"
      onClose={onClose}
      closeOnBackdrop
    >
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="account-dialog-title">
              {account ? "Editar conta" : "Nova conta"}
            </h2>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <Fieldset disabled={saving}>
            <Field>
              Nome da conta
              <input
                name="name"
                autoFocus
                placeholder="Ex.: Nubank, Itaú, carteira"
                maxLength={50}
                defaultValue={account?.name}
                required
              />
            </Field>
            <AmountField label="Saldo inicial" htmlFor="opening-balance">
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
            </AmountField>
            <FieldHint>
              O saldo da conta soma este valor com as receitas e subtrai as
              despesas.
            </FieldHint>
            {error && <FormError id="form-error">{error}</FormError>}
            {serverError && <FormError>{serverError}</FormError>}
            <DialogFooter>
              <Button type="button" variant="text" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={17} />
                {saving
                  ? "Salvando…"
                  : account
                    ? "Salvar alterações"
                    : "Adicionar conta"}
              </Button>
            </DialogFooter>
          </Fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

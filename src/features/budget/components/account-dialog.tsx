import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import {
  AmountField,
  Field,
  FieldError,
  FieldHint,
  Fieldset,
  FormError,
} from "@/components/ui/field/field";
import { formatAmountInput, formText, newId } from "@/features/budget/domain/format";
import {
  accountFormSchema,
  fieldErrors,
} from "@/features/budget/domain/schemas";
import type { BankAccount } from "@/features/budget/domain/types";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    const parsed = accountFormSchema.safeParse({
      name: formText(new FormData(event.currentTarget), "name"),
      openingBalance: openingValue,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (
        await onSave({
          id: account?.id ?? newId(),
          name: parsed.data.name,
          openingBalance: parsed.data.openingBalance,
          revision: account?.revision,
        })
      )
        onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog labelledBy="account-dialog-title" onClose={onClose} closeOnBackdrop>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="account-dialog-title">
              {account ? "Editar conta" : "Nova conta"}
            </h2>
          </div>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)}>
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
                aria-describedby={errors.name ? "account-name-error" : undefined}
                aria-invalid={errors.name ? true : undefined}
              />
              <FieldError id="account-name-error">{errors.name}</FieldError>
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
                aria-describedby={
                  errors.openingBalance ? "opening-balance-error" : undefined
                }
                aria-invalid={errors.openingBalance ? true : undefined}
              />
            </AmountField>
            <FieldError id="opening-balance-error">
              {errors.openingBalance}
            </FieldError>
            <FieldHint>
              O saldo da conta soma este valor com as receitas e subtrai as
              despesas.
            </FieldHint>
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

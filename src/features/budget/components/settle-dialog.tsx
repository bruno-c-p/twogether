import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import {
  Field,
  FieldError,
  FieldHint,
  Fieldset,
  FormError,
} from "@/components/ui/field/field";
import { formText, localDate, money } from "@/features/budget/domain/format";
import { dateSchema } from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import type {
  BankAccount,
  Member,
  Transaction,
} from "@/features/budget/domain/types";

export interface SettleInput {
  date: string;
  payerAccountId: string;
  partnerAccountId: string;
}

export function SettleDialog({
  transaction,
  members,
  accounts,
  busy,
  serverError,
  onConfirm,
  onClose,
}: {
  transaction: Transaction;
  members: Member[];
  accounts: BankAccount[];
  // The payment is being saved; the caller closes the dialog when it succeeds.
  busy: boolean;
  serverError: string;
  onConfirm: (input: SettleInput) => Promise<void>;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const payer =
    members.find((member) => member.id === transaction.memberId)?.name ??
    "a outra pessoa";

  const share = partnerShare(transaction.amount);
  const accountIds = new Set(accounts.map((account) => account.id));

  const defaultAccount = accountIds.has(transaction.accountId)
    ? transaction.accountId
    : "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;
    const form = new FormData(event.currentTarget);

    const input = {
      date: formText(form, "date"),
      payerAccountId: formText(form, "payerAccountId"),
      partnerAccountId: formText(form, "partnerAccountId"),
    };

    const next: Record<string, string> = {};

    if (!dateSchema.safeParse(input.date).success)
      next.date = "Escolha uma data válida.";

    if (!accountIds.has(input.payerAccountId))
      next.payerAccountId = "Escolha uma conta bancária.";

    if (!accountIds.has(input.partnerAccountId))
      next.partnerAccountId = "Escolha uma conta bancária.";
    setErrors(next);

    if (Object.keys(next).length) return;
    void onConfirm(input);
  }

  function accountSelect(name: keyof SettleInput, label: string) {
    return (
      <Field>
        {label}
        <select
          name={name}
          aria-label={label}
          defaultValue={defaultAccount}
          required
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          aria-invalid={errors[name] ? true : undefined}
        >
          {!defaultAccount && <option value="">Selecione uma conta</option>}
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <FieldError id={`${name}-error`}>{errors[name]}</FieldError>
      </Field>
    );
  }

  return (
    <Dialog labelledBy="settle-dialog-title" onClose={onClose} closeOnBackdrop>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="settle-dialog-title">Marcar como pago</h2>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <Fieldset disabled={busy}>
            <div className="mb-[18px]">
              <FieldHint>
                {`Você paga ${money(share)} a ${payer} por “${transaction.description}”.`}{" "}
                Vamos registrar uma receita para {payer} e uma despesa para você
                com esse valor.
              </FieldHint>
            </div>
            <Field>
              Data do pagamento
              <input
                type="date"
                name="date"
                aria-label="Data do pagamento"
                defaultValue={localDate()}
                min="1900-01-01"
                max="9999-12-31"
                required
                aria-describedby={errors.date ? "date-error" : undefined}
                aria-invalid={errors.date ? true : undefined}
              />
              <FieldError id="date-error">{errors.date}</FieldError>
            </Field>
            {accountSelect("partnerAccountId", "Conta de onde você pagou")}
            {accountSelect("payerAccountId", `Conta onde ${payer} recebeu`)}
            {serverError && <FormError>{serverError}</FormError>}
            <DialogFooter>
              <DialogDismiss>Cancelar</DialogDismiss>
              <Button type="submit">
                <Check size={17} />
                {busy ? "Salvando…" : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </Fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

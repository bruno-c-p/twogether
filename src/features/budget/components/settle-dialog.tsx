import { Form as BaseForm } from "@base-ui/react/form";
import { Input } from "@/components/ui/input";
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
import type { Member, Transaction } from "@/features/budget/domain/types";

export interface SettleInput {
  date: string;
}

export function SettleDialog({
  transaction,
  members,
  busy,
  serverError,
  onConfirm,
  onClose,
}: {
  transaction: Transaction;
  members: Member[];
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;
    const form = new FormData(event.currentTarget);

    const input = { date: formText(form, "date") };

    const next: Record<string, string> = {};

    if (!dateSchema.safeParse(input.date).success)
      next.date = "Escolha uma data válida.";
    setErrors(next);

    if (Object.keys(next).length) return;
    void onConfirm(input);
  }

  return (
    <Dialog labelledBy="settle-dialog-title" onClose={onClose} closeOnBackdrop>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="settle-dialog-title">Marcar como pago</h2>
          </div>
        </DialogHeader>
        <BaseForm onSubmit={submit}>
          <Fieldset disabled={busy}>
            <div className="mb-4">
              <FieldHint>
                {`Você paga ${money(share)} a ${payer} por “${transaction.description}”.`}{" "}
                Vamos registrar uma receita para {payer} e uma despesa para você
                com esse valor.
              </FieldHint>
            </div>
            <Field>
              Data do pagamento
              <Input
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
            {serverError && <FormError>{serverError}</FormError>}
            <DialogFooter>
              <DialogDismiss>Cancelar</DialogDismiss>
              <Button type="submit">
                <Check size={17} />
                {busy ? "Salvando…" : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </Fieldset>
        </BaseForm>
      </DialogContent>
    </Dialog>
  );
}

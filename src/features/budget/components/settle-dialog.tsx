import { Form as BaseForm } from "@base-ui/react/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
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
import { money } from "@/features/budget/domain/format";
import { dateSchema } from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";

const settleFormSchema = z.object({ date: dateSchema });

export type SettleInput = z.infer<typeof settleFormSchema>;

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settleFormSchema),
    defaultValues: { date: today(browserTimeZone()) },
  });

  const dateError = errors.date?.message;

  const payer =
    members.find((member) => member.id === transaction.memberId)?.name ??
    "a outra pessoa";

  const share = partnerShare(transaction.amount);

  function confirm(input: SettleInput) {
    if (!busy) void onConfirm(input);
  }

  return (
    <Dialog labelledBy="settle-dialog-title" onClose={onClose} closeOnBackdrop>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="settle-dialog-title">Marcar como pago</h2>
          </div>
        </DialogHeader>
        <BaseForm onSubmit={(event) => void handleSubmit(confirm)(event)}>
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
                {...register("date")}
                type="date"
                aria-label="Data do pagamento"
                min="1900-01-01"
                max="9999-12-31"
                required
                aria-describedby={dateError ? "date-error" : undefined}
                aria-invalid={dateError ? true : undefined}
              />
              <FieldError id="date-error">{dateError}</FieldError>
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

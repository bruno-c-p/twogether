import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldSet,
  Form,
  FormStatus,
} from "@/components/glaze/ui/field";
import { money } from "@/features/budget/domain/format";
import { dateSchema } from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { IsoDatePicker } from "@/features/budget/components/transaction-dialog/iso-date-picker";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";

const settleFormSchema = z.object({ date: dateSchema });

export type SettleInput = z.infer<typeof settleFormSchema>;

const FORM_ID = "settle-form";

interface Props {
  open: boolean;
  transaction: Transaction | null;
  members: Member[];
  // The payment is being saved; the caller closes the dialog when it succeeds.
  busy: boolean;
  serverError: string;
  onConfirm: (input: SettleInput) => Promise<void>;
  onClose: () => void;
}

export function SettleDialog({
  open,
  transaction,
  members,
  busy,
  serverError,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
          {transaction && (
            <SettleDescription transaction={transaction} members={members} />
          )}
        </DialogHeader>
        <SettleForm
          busy={busy}
          serverError={serverError}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function SettleDescription({
  transaction,
  members,
}: Pick<Props, "members"> & { transaction: Transaction }) {
  const payer =
    members.find((member) => member.id === transaction.memberId)?.name ??
    "a outra pessoa";

  return (
    <DialogDescription>
      {`Você paga ${money(partnerShare(transaction.amount))} a ${payer} por “${transaction.description}”.`}{" "}
      Vamos registrar uma receita para {payer} e uma despesa para você com esse
      valor.
    </DialogDescription>
  );
}

// Mounted with the dialog's content, so every open starts on today.
function SettleForm({
  busy,
  serverError,
  onConfirm,
}: Pick<Props, "busy" | "serverError" | "onConfirm">) {
  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settleFormSchema),
    defaultValues: { date: today(browserTimeZone()) },
  });

  const date = useWatch({ control, name: "date" });
  const dateError = errors.date?.message;

  function confirm(input: SettleInput) {
    if (!busy) void onConfirm(input);
  }

  return (
    <>
      <DialogBody>
        <Form
          id={FORM_ID}
          onSubmit={(event) => void handleSubmit(confirm)(event)}
        >
          <FieldSet disabled={busy}>
            <Field invalid={Boolean(dateError)}>
              <FieldLabel>Data do pagamento</FieldLabel>
              <IsoDatePicker
                value={date}
                onValueChange={(next) => setValue("date", next)}
                aria-invalid={dateError ? true : undefined}
              />
              {dateError && (
                <FieldError id="date-error">{dateError}</FieldError>
              )}
            </Field>
            {serverError && (
              <FormStatus status="fail">{serverError}</FormStatus>
            )}
          </FieldSet>
        </Form>
      </DialogBody>
      <DialogFooter>
        <DialogClose>Cancelar</DialogClose>
        <DialogAction
          type="submit"
          form={FORM_ID}
          pending={busy}
          pendingLabel="Salvando…"
        >
          Confirmar pagamento
        </DialogAction>
      </DialogFooter>
    </>
  );
}

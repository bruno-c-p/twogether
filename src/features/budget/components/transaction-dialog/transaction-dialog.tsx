import { Form as BaseForm } from "@base-ui/react/form";
import { Input } from "@/components/ui/input";
import type { FormEvent, ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Check, Trash2 } from "lucide-react";
import {
  formatAmountInput,
  newId,
  parseAmount,
} from "@/features/budget/domain/format";
import { transactionFormSchema } from "@/features/budget/domain/schemas";
import { transactionStatus } from "@/features/budget/domain/status";
import { deleteLock } from "@/features/budget/domain/view";
import { fieldErrors } from "@/lib/zod-errors";
import type {
  GoalId,
  Transaction,
  TransactionKind,
  Member,
} from "@/features/budget/domain/types";
import { GOALS } from "@/features/budget/constants";
import { GoalPicker } from "@/features/budget/components/goal-picker/goal-picker";
import { KindToggle } from "@/features/budget/components/kind-toggle/kind-toggle";
import { SplitPanel } from "@/features/budget/components/split-panel";
import { RecurrencePanel } from "@/features/budget/components/recurrence-panel/recurrence-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import {
  AmountField,
  FieldError,
  FieldRoot,
  FieldLabel,
  FieldHint,
  FieldRow,
  Fieldset,
  FormError,
  GroupError,
} from "@/components/ui/field/field";

interface Props {
  transaction: Transaction | null;
  defaultDate: string;
  members: Member[];
  currentUserId: string;
  // The save is in flight; the caller closes the dialog when it succeeds,
  // and also after a successful unsettle.
  busy: boolean;
  serverError: string;
  splitBusy: boolean;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<void>;
  onSettle: (transaction: Transaction) => void;
  onUnsettle: (transaction: Transaction) => Promise<void>;
  onDelete: (transaction: Transaction) => void;
  onClose: () => void;
}

type FieldErrors = Partial<Record<ValidatedField, string>>;

// Everything the dialog edits. `revision` is the version the dialog opened
// at, so a save never overwrites changes it did not show.
interface TransactionFormValues {
  kind: TransactionKind;
  amount: string;
  description: string;
  date: string;
  goal: GoalId | null;
  recurring: boolean;
  occurrences: number;
  split: boolean;
  revision: number | undefined;
}

// Fields whose schema errors show next to them.
const VALIDATED_FIELDS = [
  "amount",
  "description",
  "date",
  "goal",
  "occurrences",
] as const;

type ValidatedField = (typeof VALIDATED_FIELDS)[number];

const SOMEONE = "uma pessoa do casal";

// Only expenses let the person pick a goal; a transfer always fills freedom.
const KIND_GOAL = {
  expense: null,
  income: null,
  transfer: "freedom",
} as const satisfies Record<TransactionKind, GoalId | null>;

function invalidProps(error: string | undefined, id: string) {
  return {
    "aria-describedby": error ? id : undefined,
    "aria-invalid": error ? true : undefined,
  };
}

function memberName(members: Member[], id: string | undefined) {
  return members.find((member) => member.id === id)?.name ?? SOMEONE;
}

function submitLabel(saving: boolean, editing: boolean) {
  if (saving) return "Salvando…";

  return editing ? "Salvar alterações" : "Adicionar transação";
}

function defaultValues(
  transaction: Transaction | null,
  defaultDate: string,
): TransactionFormValues {
  return {
    kind: transaction?.kind ?? "expense",
    amount: transaction ? formatAmountInput(String(transaction.amount)) : "",
    description: transaction?.description ?? "",
    date: transaction?.date ?? defaultDate,
    goal: transaction?.goal ?? null,
    recurring: false,
    occurrences: 12,
    split: Boolean(transaction?.split),
    revision: transaction?.revision,
  };
}

function useTransactionForm({
  transaction,
  defaultDate,
  members,
  currentUserId,
  busy,
  onSave,
}: Pick<
  Props,
  | "transaction"
  | "defaultDate"
  | "members"
  | "currentUserId"
  | "busy"
  | "onSave"
>) {
  const form = useForm<TransactionFormValues>({
    defaultValues: defaultValues(transaction, defaultDate),
  });

  const { control, setValue, setError, clearErrors } = form;

  const [kind, amount, goal, recurring, occurrences, split] = useWatch({
    control,
    name: ["kind", "amount", "goal", "recurring", "occurrences", "split"],
  });

  const errors: FieldErrors = {};

  for (const field of VALIDATED_FIELDS)
    errors[field] = form.formState.errors[field]?.message;

  const status = transaction
    ? transactionStatus(transaction, currentUserId)
    : undefined;

  // Only expenses between the two partners split; repayments never do.
  const canSplit =
    kind === "expense" && members.length === 2 && !status?.repayment;

  const memberId = transaction?.memberId ?? currentUserId;

  function changeKind(next: TransactionKind) {
    setValue("kind", next);
    setValue("goal", KIND_GOAL[next]);
  }

  function save(values: TransactionFormValues) {
    if (busy) return;

    const parsed = transactionFormSchema.safeParse({
      amount: values.amount,
      description: values.description,
      date: values.date,
      goal: values.goal,
      kind: values.kind,
      occurrences: values.recurring && !transaction ? values.occurrences : 1,
      split: canSplit && values.split,
    });

    if (!parsed.success) {
      const messages = fieldErrors(parsed.error);

      for (const field of VALIDATED_FIELDS) {
        const message = messages[field];

        if (message) setError(field, { message });
      }

      return;
    }

    const next: Transaction = {
      id: transaction?.id ?? newId(),
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: parsed.data.date,
      kind: parsed.data.kind,
      goal: parsed.data.kind === "income" ? null : parsed.data.goal,
      memberId,
      revision: values.revision,
    };

    if (canSplit && parsed.data.split) next.split = transaction?.split ?? {};

    void onSave(next, parsed.data.occurrences);
  }

  return {
    register: form.register,
    // The schema's errors are set by hand on fields with no input (goal,
    // occurrences), so each submit starts clean before validating again.
    submit: (event: FormEvent<HTMLFormElement>) => {
      clearErrors();

      return form.handleSubmit(save)(event);
    },
    kind,
    changeKind,
    goal,
    setGoal: (next: GoalId) => setValue("goal", next),
    amount,
    recurring,
    setRecurring: (next: boolean) => setValue("recurring", next),
    occurrences,
    setOccurrences: (next: number) => setValue("occurrences", next),
    errors,
    split,
    setSplit: (next: boolean) => setValue("split", next),
    canSplit,
    status,
    paid: Boolean(status?.paidAt),
    memberId,
  };
}

type TransactionFormState = ReturnType<typeof useTransactionForm>;

function AmountInput({ form }: { form: TransactionFormState }) {
  const field = form.register("amount");

  return (
    <FieldRoot>
      <AmountField label="Valor" htmlFor="amount">
        <Input
          {...field}
          id="amount"
          data-initial-focus=""
          autoFocus
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          placeholder="0,00"
          maxLength={14}
          required
          readOnly={form.paid}
          // Digits fill in from the cents, so the caret stays at the end.
          onChange={(event) => {
            const input = event.currentTarget;

            input.value = formatAmountInput(input.value);
            input.setSelectionRange(input.value.length, input.value.length);
            void field.onChange(event);
          }}
          {...invalidProps(form.errors.amount, "amount-error")}
        />
      </AmountField>
      <FieldError id="amount-error">{form.errors.amount}</FieldError>
    </FieldRoot>
  );
}

function DescriptionAndDate({ form }: { form: TransactionFormState }) {
  const { errors, register } = form;

  return (
    <FieldRow>
      <FieldRoot>
        <FieldLabel>
          Descrição
          <Input
            {...register("description")}
            placeholder="Ex.: supermercado"
            maxLength={80}
            required
            {...invalidProps(errors.description, "description-error")}
          />
          <FieldError id="description-error">{errors.description}</FieldError>
        </FieldLabel>
      </FieldRoot>
      <FieldRoot>
        <FieldLabel>
          Data
          <Input
            {...register("date")}
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            required
            {...invalidProps(errors.date, "date-error")}
          />
          <FieldError id="date-error">{errors.date}</FieldError>
        </FieldLabel>
      </FieldRoot>
    </FieldRow>
  );
}

function AuditHint({
  transaction,
  members,
}: {
  transaction: Transaction | null;
  members: Member[];
}) {
  if (!transaction?.updatedBy) return null;

  return (
    <FieldHint>
      Registrado por {memberName(members, transaction.createdBy)}. Última
      alteração por {memberName(members, transaction.updatedBy)}.
    </FieldHint>
  );
}

function SplitSection({
  form,
  transaction,
  members,
  currentUserId,
  busy,
  onSettle,
  onUnsettle,
}: Pick<Props, "members" | "currentUserId" | "onSettle" | "onUnsettle"> & {
  form: TransactionFormState;
  transaction: Transaction | null;
  busy: boolean;
}) {
  const payer = members.find((member) => member.id === form.memberId);
  const debtor = members.find((member) => member.id !== form.memberId);

  if (!form.canSplit || !debtor) return null;

  const userIsDebtor = debtor.id === currentUserId;
  const payerName = payer?.name ?? "a outra pessoa";

  return (
    <SplitPanel
      checked={form.split}
      amount={parseAmount(form.amount) ?? 0}
      transaction={transaction}
      status={form.status}
      title={
        userIsDebtor
          ? `Dividir entre ${payerName} e você`
          : `Dividir com ${debtor.name}`
      }
      payerName={payer?.id === currentUserId ? "você" : (payer?.name ?? "")}
      debtorName={userIsDebtor ? "você" : debtor.name}
      userIsDebtor={userIsDebtor}
      busy={busy}
      onChange={form.setSplit}
      onSettle={() => {
        if (transaction) onSettle(transaction);
      }}
      onUnsettle={() => {
        if (transaction) void onUnsettle(transaction);
      }}
    />
  );
}

// On phones the list has no delete icon, so the dialog is where it lives.
function DeleteButton({
  transaction,
  userId,
  onDelete,
}: {
  transaction: Transaction;
  userId: string;
  onDelete: (transaction: Transaction) => void;
}) {
  const lock = deleteLock(transactionStatus(transaction, userId));

  return (
    <div className="grid gap-1.5 mt-2">
      <Button
        variant="unstyled"
        className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md border-0 bg-danger-soft text-danger text-sm font-600"
        disabled={Boolean(lock)}
        aria-describedby={lock ? "delete-lock" : undefined}
        onClick={() => onDelete(transaction)}
      >
        <Trash2 size={16} /> Excluir transação
      </Button>
      {lock && <FieldHint id="delete-lock">Para excluir: {lock}.</FieldHint>}
    </div>
  );
}

// Freedom is a transfer's goal; only a legacy split freedom expense keeps it.
function expenseGoals(transaction: Transaction | null) {
  const legacy =
    transaction?.kind === "expense" &&
    transaction.goal === "freedom" &&
    Boolean(transaction.split);

  return legacy ? GOALS : GOALS.filter((goal) => goal.id !== "freedom");
}

function ClassificationFields({
  form,
  transaction,
  split,
}: {
  form: TransactionFormState;
  transaction: Transaction | null;
  split: ReactNode;
}) {
  return (
    <>
      {!transaction && (
        <RecurrencePanel
          recurring={form.recurring}
          occurrences={form.occurrences}
          error={form.errors.occurrences}
          onRecurringChange={form.setRecurring}
          onOccurrencesChange={form.setOccurrences}
        />
      )}
      {form.kind === "expense" && (
        <>
          <GoalPicker
            goals={expenseGoals(transaction)}
            value={form.goal}
            onChange={form.setGoal}
          />
          <GroupError id="goal-error">{form.errors.goal}</GroupError>
        </>
      )}
      {split}
    </>
  );
}

export function TransactionDialog({
  transaction,
  defaultDate,
  members,
  currentUserId,
  busy,
  serverError,
  splitBusy,
  onSave,
  onSettle,
  onUnsettle,
  onDelete,
  onClose,
}: Props) {
  const form = useTransactionForm({
    transaction,
    defaultDate,
    members,
    currentUserId,
    busy,
    onSave,
  });

  return (
    <Dialog labelledBy="dialog-title" onClose={onClose} closeOnBackdrop>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="dialog-title">
              {transaction ? "Editar transação" : "Nova transação"}
            </h2>
          </div>
        </DialogHeader>
        <BaseForm onSubmit={(event) => void form.submit(event)}>
          <Fieldset disabled={busy}>
            <KindToggle
              kind={form.kind}
              disabled={form.paid}
              onChange={form.changeKind}
            />
            <AmountInput form={form} />
            <DescriptionAndDate form={form} />
            <ClassificationFields
              form={form}
              transaction={transaction}
              split={
                <SplitSection
                  form={form}
                  transaction={transaction}
                  members={members}
                  currentUserId={currentUserId}
                  busy={splitBusy}
                  onSettle={onSettle}
                  onUnsettle={onUnsettle}
                />
              }
            />
            {serverError && <FormError>{serverError}</FormError>}
            <AuditHint transaction={transaction} members={members} />
            {transaction && (
              <DeleteButton
                transaction={transaction}
                userId={currentUserId}
                onDelete={onDelete}
              />
            )}
            <DialogFooter>
              <DialogDismiss>Cancelar</DialogDismiss>
              <Button type="submit">
                <Check size={17} />
                {submitLabel(busy, Boolean(transaction))}
              </Button>
            </DialogFooter>
          </Fieldset>
        </BaseForm>
      </DialogContent>
    </Dialog>
  );
}

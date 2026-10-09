import { Form as BaseForm } from "@base-ui/react/form";
import { Input } from "@/components/ui/input";
import type { FormEvent, ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import {
  formatAmountInput,
  newId,
  normalizeTag,
  parseAmount,
} from "@/features/budget/domain/format";
import { transactionFormSchema } from "@/features/budget/domain/schemas";
import { fieldErrors } from "@/lib/zod-errors";
import type {
  GoalId,
  Transaction,
  TransactionKind,
  Member,
} from "@/features/budget/domain/types";
import { GoalPicker } from "@/features/budget/components/goal-picker/goal-picker";
import { KindToggle } from "@/features/budget/components/kind-toggle/kind-toggle";
import { SplitPanel } from "@/features/budget/components/split-panel";
import { RecurrencePanel } from "@/features/budget/components/recurrence-panel/recurrence-panel";
import { TagPicker } from "@/features/budget/components/tag-picker/tag-picker";
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
  existingTags: string[];
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
  tags: string[];
  tagInput: string;
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

const MAX_TAGS = 8;

const SOMEONE = "uma pessoa do casal";

function invalidProps(error: string | undefined, id: string) {
  return {
    "aria-describedby": error ? id : undefined,
    "aria-invalid": error ? true : undefined,
  };
}

function withPendingTag(tags: string[], input: string) {
  const pending = normalizeTag(input);

  if (!pending || tags.includes(pending)) return tags;

  return [...tags, pending].slice(0, MAX_TAGS);
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
    tags: transaction?.tags ?? [],
    tagInput: "",
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

  const { control, setValue, getValues, setError, clearErrors } = form;

  const [kind, amount, goal, tags, tagInput, recurring, occurrences, split] =
    useWatch({
      control,
      name: [
        "kind",
        "amount",
        "goal",
        "tags",
        "tagInput",
        "recurring",
        "occurrences",
        "split",
      ],
    });

  const errors: FieldErrors = {};

  for (const field of VALIDATED_FIELDS)
    errors[field] = form.formState.errors[field]?.message;

  // Only expenses between the two partners split; repayments never do.
  const canSplit =
    kind === "expense" && members.length === 2 && !transaction?.settlementOf;

  const memberId = transaction?.memberId ?? currentUserId;

  function changeKind(next: TransactionKind) {
    setValue("kind", next);

    if (next === "income") setValue("goal", null);
  }

  function addTag(value: string) {
    const tag = normalizeTag(value);
    const current = getValues("tags");

    if (tag && !current.includes(tag) && current.length < MAX_TAGS)
      setValue("tags", [...current, tag]);

    setValue("tagInput", "");
  }

  function removeTag(tag: string) {
    setValue(
      "tags",
      getValues("tags").filter((t) => t !== tag),
    );
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
      tags: withPendingTag(values.tags, values.tagInput),
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
    tags,
    tagInput,
    setTagInput: (next: string) => setValue("tagInput", next),
    addTag,
    removeTag,
    amount,
    recurring,
    setRecurring: (next: boolean) => setValue("recurring", next),
    occurrences,
    setOccurrences: (next: number) => setValue("occurrences", next),
    errors,
    split,
    setSplit: (next: boolean) => setValue("split", next),
    canSplit,
    paid: Boolean(transaction?.split?.paidAt),
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

function ClassificationFields({
  form,
  transaction,
  existingTags,
  split,
}: {
  form: TransactionFormState;
  transaction: Transaction | null;
  existingTags: string[];
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
          <GoalPicker value={form.goal} onChange={form.setGoal} />
          <GroupError id="goal-error">{form.errors.goal}</GroupError>
        </>
      )}
      {split}
      <TagPicker
        tags={form.tags}
        input={form.tagInput}
        existingTags={existingTags}
        onInput={form.setTagInput}
        onAdd={form.addTag}
        onRemove={form.removeTag}
      />
    </>
  );
}

export function TransactionDialog({
  transaction,
  defaultDate,
  existingTags,
  members,
  currentUserId,
  busy,
  serverError,
  splitBusy,
  onSave,
  onSettle,
  onUnsettle,
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
              existingTags={existingTags}
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

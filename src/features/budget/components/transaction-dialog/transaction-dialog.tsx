import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Check } from "lucide-react";
import {
  formatAmountInput,
  formText,
  newId,
  normalizeTag,
  parseAmount,
} from "@/features/budget/domain/format";
import {
  fieldErrors,
  transactionFormSchema,
} from "@/features/budget/domain/schemas";
import type { PhraseDraft } from "@/features/budget/domain/phrase";
import type {
  BankAccount,
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
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import {
  AmountField,
  Field,
  FieldError,
  FieldHint,
  FieldRow,
  Fieldset,
  FormError,
} from "@/components/ui/field/field";

interface Props {
  transaction: Transaction | null;
  // A parsed phrase that prefills a new transaction.
  draft?: PhraseDraft;
  defaultDate: string;
  existingTags: string[];
  members: Member[];
  accounts: BankAccount[];
  currentUserId: string;
  serverError: string;
  splitBusy: boolean;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onSettle: (transaction: Transaction) => void;
  onUnsettle: (transaction: Transaction) => Promise<boolean>;
  onClose: () => void;
}

type FieldErrors = Record<string, string>;

const MAX_TAGS = 8;

const SOMEONE = "uma pessoa do casal";

function invalidProps(errors: FieldErrors, field: string, id: string) {
  return {
    "aria-describedby": errors[field] ? id : undefined,
    "aria-invalid": errors[field] ? true : undefined,
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

function defaultAccountId(
  transaction: Transaction | null,
  draft: PhraseDraft | undefined,
  accounts: BankAccount[],
) {
  const fallback = accounts.length === 1 ? accounts[0].id : "";

  return transaction?.accountId ?? (draft?.accountId || fallback);
}

function useSplitChoice({
  transaction,
  draft,
  members,
  kind,
  currentUserId,
}: {
  transaction: Transaction | null;
  draft: PhraseDraft | undefined;
  members: Member[];
  kind: TransactionKind;
  currentUserId: string;
}) {
  const [split, setSplit] = useState(
    Boolean(transaction?.split) || Boolean(draft?.split),
  );

  // Only expenses between the two partners split; repayments never do.
  const canSplit =
    kind === "expense" && members.length === 2 && !transaction?.settlementOf;

  return {
    split,
    setSplit,
    canSplit,
    paid: Boolean(transaction?.split?.paidAt),
    memberId: transaction?.memberId ?? currentUserId,
  };
}

function useTransactionForm({
  transaction,
  draft,
  members,
  accounts,
  currentUserId,
  onSave,
  onClose,
}: Pick<
  Props,
  | "transaction"
  | "draft"
  | "members"
  | "accounts"
  | "currentUserId"
  | "onSave"
  | "onClose"
>) {
  const prefill = transaction ?? draft;

  const [kind, setKind] = useState<TransactionKind>(prefill?.kind ?? "expense");

  const [goal, setGoal] = useState(prefill?.goal ?? null);
  const [tags, setTags] = useState(prefill?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [amountValue, setAmountValue] = useState(
    prefill ? formatAmountInput(String(prefill.amount)) : "",
  );

  const [recurring, setRecurring] = useState(Boolean(draft?.recurring));
  const [occurrences, setOccurrences] = useState(12);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { split, setSplit, canSplit, paid, memberId } = useSplitChoice({
    transaction,
    draft,
    members,
    kind,
    currentUserId,
  });

  function changeKind(next: TransactionKind) {
    setKind(next);

    if (next === "income") setGoal(null);
  }

  function addTag(value: string) {
    const tag = normalizeTag(value);

    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS)
      setTags([...tags, tag]);

    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function save(parsed: TransactionForm, completeTags: string[]) {
    setErrors({});
    setSaving(true);

    const next: Transaction = {
      id: transaction?.id ?? newId(),
      amount: parsed.amount,
      description: parsed.description,
      date: parsed.date,
      kind: parsed.kind,
      goal: parsed.kind === "income" ? null : parsed.goal,
      tags: completeTags,
      accountId: parsed.accountId,
      memberId,
      revision: transaction?.revision,
    };

    if (canSplit && split) next.split = transaction?.split ?? {};

    try {
      const saved = await onSave(next, parsed.occurrences);

      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const form = new FormData(event.currentTarget);

    const parsed = transactionFormSchema(accounts).safeParse({
      amount: formText(form, "amount"),
      description: formText(form, "description"),
      date: formText(form, "date"),
      accountId: formText(form, "accountId"),
      goal,
      kind,
      occurrences: recurring && !transaction ? occurrences : 1,
      split: canSplit && split,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));

      return;
    }

    await save(parsed.data, withPendingTag(tags, tagInput));
  }

  return {
    kind,
    changeKind,
    goal,
    setGoal,
    tags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    amountValue,
    setAmountValue,
    recurring,
    setRecurring,
    occurrences,
    setOccurrences,
    saving,
    errors,
    submit,
    split,
    setSplit,
    canSplit,
    paid,
    memberId,
  };
}

type TransactionFormState = ReturnType<typeof useTransactionForm>;

type TransactionForm = Extract<
  ReturnType<ReturnType<typeof transactionFormSchema>["safeParse"]>,
  { success: true }
>["data"];

function AmountInput({
  form,
  amountInput,
}: {
  form: TransactionFormState;
  amountInput: RefObject<HTMLInputElement | null>;
}) {
  useEffect(() => {
    const input = amountInput.current;

    if (!input) return;

    input.setSelectionRange(input.value.length, input.value.length);
  }, [amountInput, form.amountValue]);

  return (
    <>
      <AmountField label="Valor" htmlFor="amount">
        <input
          id="amount"
          ref={amountInput}
          name="amount"
          autoFocus
          type="text"
          inputMode="numeric"
          placeholder="0,00"
          maxLength={14}
          required
          readOnly={form.paid}
          value={form.amountValue}
          onChange={(event) =>
            form.setAmountValue(formatAmountInput(event.currentTarget.value))
          }
          {...invalidProps(form.errors, "amount", "amount-error")}
        />
      </AmountField>
      <FieldError id="amount-error">{form.errors.amount}</FieldError>
    </>
  );
}

function DescriptionAndDate({
  transaction,
  draft,
  defaultDate,
  errors,
}: {
  transaction: Transaction | null;
  draft: PhraseDraft | undefined;
  defaultDate: string;
  errors: FieldErrors;
}) {
  const prefill = transaction ?? draft;

  return (
    <FieldRow>
      <label>
        Descrição
        <input
          name="description"
          placeholder="Ex.: supermercado"
          maxLength={80}
          defaultValue={prefill?.description}
          required
          {...invalidProps(errors, "description", "description-error")}
        />
        <FieldError id="description-error">{errors.description}</FieldError>
      </label>
      <label>
        Data
        <input
          type="date"
          name="date"
          defaultValue={prefill?.date ?? defaultDate}
          min="1900-01-01"
          max="9999-12-31"
          required
          {...invalidProps(errors, "date", "date-error")}
        />
        <FieldError id="date-error">{errors.date}</FieldError>
      </label>
    </FieldRow>
  );
}

function AccountSelect({
  transaction,
  draft,
  accounts,
  errors,
}: {
  transaction: Transaction | null;
  draft: PhraseDraft | undefined;
  accounts: BankAccount[];
  errors: FieldErrors;
}) {
  return (
    <Field htmlFor="transaction-account">
      Conta
      <select
        id="transaction-account"
        name="accountId"
        aria-label="Conta"
        defaultValue={defaultAccountId(transaction, draft, accounts)}
        required
        {...invalidProps(errors, "accountId", "account-error")}
      >
        {accounts.length !== 1 && <option value="">Selecione uma conta</option>}
        {accounts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <FieldError id="account-error">{errors.accountId}</FieldError>
    </Field>
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
  onClose,
}: Pick<
  Props,
  "members" | "currentUserId" | "onSettle" | "onUnsettle" | "onClose"
> & {
  form: TransactionFormState;
  transaction: Transaction | null;
  busy: boolean;
}) {
  const payer = members.find((member) => member.id === form.memberId);
  const debtor = members.find((member) => member.id !== form.memberId);

  if (!form.canSplit || !debtor) return null;

  const userIsDebtor = debtor.id === currentUserId;
  const payerName = payer?.name ?? "a outra pessoa";

  async function unsettle() {
    if (transaction && (await onUnsettle(transaction))) onClose();
  }

  return (
    <SplitPanel
      checked={form.split}
      amount={parseAmount(form.amountValue) ?? 0}
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
      onUnsettle={() => void unsettle()}
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
          <FieldError id="goal-error">{form.errors.goal}</FieldError>
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
  draft,
  defaultDate,
  existingTags,
  members,
  accounts,
  currentUserId,
  serverError,
  splitBusy,
  onSave,
  onSettle,
  onUnsettle,
  onClose,
}: Props) {
  const form = useTransactionForm({
    transaction,
    draft,
    members,
    accounts,
    currentUserId,
    onSave,
    onClose,
  });

  const amountInput = useRef<HTMLInputElement>(null);

  // Runs after <Dialog> calls showModal(), which would otherwise move focus
  // to the close button.
  useEffect(() => {
    amountInput.current?.focus();
  }, []);

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
        <form onSubmit={(event) => void form.submit(event)}>
          <Fieldset disabled={form.saving}>
            <KindToggle
              kind={form.kind}
              disabled={form.paid}
              onChange={form.changeKind}
            />
            <AmountInput form={form} amountInput={amountInput} />
            <DescriptionAndDate
              transaction={transaction}
              draft={draft}
              defaultDate={defaultDate}
              errors={form.errors}
            />
            <AccountSelect
              transaction={transaction}
              draft={draft}
              accounts={accounts}
              errors={form.errors}
            />
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
                  onClose={onClose}
                />
              }
            />
            {serverError && <FormError>{serverError}</FormError>}
            <AuditHint transaction={transaction} members={members} />
            <DialogFooter>
              <Button type="button" variant="text" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={17} />
                {submitLabel(form.saving, Boolean(transaction))}
              </Button>
            </DialogFooter>
          </Fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

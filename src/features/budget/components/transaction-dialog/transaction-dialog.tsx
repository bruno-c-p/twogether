import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Check } from "lucide-react";
import {
  formatAmountInput,
  formText,
  newId,
  normalizeTag,
} from "@/features/budget/domain/format";
import {
  fieldErrors,
  transactionFormSchema,
} from "@/features/budget/domain/schemas";
import type {
  BankAccount,
  Transaction,
  TransactionKind,
  Member,
} from "@/features/budget/domain/types";
import { GoalPicker } from "@/features/budget/components/goal-picker/goal-picker";
import { KindToggle } from "@/features/budget/components/kind-toggle/kind-toggle";
import { RecurrencePanel } from "@/features/budget/components/recurrence-panel/recurrence-panel";
import { TagPicker } from "@/features/budget/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
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
import styles from "@/features/budget/components/transaction-dialog/transaction-dialog.module.css";

interface Props {
  transaction: Transaction | null;
  defaultDate: string;
  existingTags: string[];
  members: Member[];
  accounts: BankAccount[];
  currentUserId: string;
  serverError: string;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onClose: () => void;
}

export function TransactionDialog({
  transaction,
  defaultDate,
  existingTags,
  members,
  accounts,
  currentUserId,
  serverError,
  onSave,
  onClose,
}: Props) {
  const amountInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? "expense",
  );
  const [goal, setGoal] = useState(transaction?.goal ?? null);
  const [tags, setTags] = useState(transaction?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [amountValue, setAmountValue] = useState(
    transaction ? formatAmountInput(String(transaction.amount)) : "",
  );
  const [recurring, setRecurring] = useState(false);
  const [occurrences, setOccurrences] = useState(12);
  const [saving, setSaving] = useState(false);
  const memberId = transaction?.memberId ?? currentUserId;
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    amountInput.current?.focus();
  }, []);

  useEffect(() => {
    const input = amountInput.current;
    if (!input) return;
    input.setSelectionRange(input.value.length, input.value.length);
  }, [amountValue]);

  function addTag(value: string) {
    const tag = normalizeTag(value);
    if (tag && !tags.includes(tag) && tags.length < 8) setTags([...tags, tag]);
    setTagInput("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const pendingTag = normalizeTag(tagInput);
    const completeTags =
      pendingTag && !tags.includes(pendingTag)
        ? [...tags, pendingTag].slice(0, 8)
        : tags;
    const parsed = transactionFormSchema(accounts).safeParse({
      amount: formText(form, "amount"),
      description: formText(form, "description"),
      date: formText(form, "date"),
      accountId: formText(form, "accountId"),
      goal,
      kind,
      occurrences: recurring && !transaction ? occurrences : 1,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (
        await onSave(
          {
            id: transaction?.id ?? newId(),
            amount: parsed.data.amount,
            description: parsed.data.description,
            date: parsed.data.date,
            kind: parsed.data.kind,
            goal: parsed.data.kind === "income" ? null : parsed.data.goal,
            tags: completeTags,
            accountId: parsed.data.accountId,
            memberId,
            revision: transaction?.revision,
          },
          parsed.data.occurrences,
        )
      )
        onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      className={styles.dialog}
      labelledBy="dialog-title"
      onClose={onClose}
      closeOnBackdrop
    >
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <div>
            <h2 id="dialog-title">
              {transaction ? "Editar transação" : "Nova transação"}
            </h2>
          </div>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)}>
          <Fieldset disabled={saving}>
            <KindToggle
              kind={kind}
              onChange={(next) => {
                setKind(next);
                if (next === "income") setGoal(null);
              }}
            />
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
                value={amountValue}
                onChange={(event) =>
                  setAmountValue(formatAmountInput(event.currentTarget.value))
                }
                aria-describedby={errors.amount ? "amount-error" : undefined}
                aria-invalid={errors.amount ? true : undefined}
              />
            </AmountField>
            <FieldError id="amount-error">{errors.amount}</FieldError>
            <FieldRow>
              <label>
                Descrição
                <input
                  name="description"
                  placeholder="Ex.: supermercado"
                  maxLength={80}
                  defaultValue={transaction?.description}
                  required
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  aria-invalid={errors.description ? true : undefined}
                />
                <FieldError id="description-error">
                  {errors.description}
                </FieldError>
              </label>
              <label>
                Data
                <input
                  type="date"
                  name="date"
                  defaultValue={transaction?.date ?? defaultDate}
                  min="1900-01-01"
                  max="9999-12-31"
                  required
                  aria-describedby={errors.date ? "date-error" : undefined}
                  aria-invalid={errors.date ? true : undefined}
                />
                <FieldError id="date-error">{errors.date}</FieldError>
              </label>
            </FieldRow>
            <Field>
              Conta
              <select
                name="accountId"
                defaultValue={
                  transaction?.accountId ??
                  (accounts.length === 1 ? accounts[0].id : "")
                }
                required
                aria-describedby={errors.accountId ? "account-error" : undefined}
                aria-invalid={errors.accountId ? true : undefined}
              >
                {accounts.length !== 1 && (
                  <option value="">Selecione uma conta</option>
                )}
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <FieldError id="account-error">{errors.accountId}</FieldError>
            </Field>
            {!transaction && (
              <RecurrencePanel
                recurring={recurring}
                occurrences={occurrences}
                error={errors.occurrences}
                onRecurringChange={setRecurring}
                onOccurrencesChange={setOccurrences}
              />
            )}
            {kind === "expense" && (
              <>
                <GoalPicker value={goal} onChange={setGoal} />
                <FieldError id="goal-error">{errors.goal}</FieldError>
              </>
            )}
            <TagPicker
              tags={tags}
              input={tagInput}
              existingTags={existingTags}
              onInput={setTagInput}
              onAdd={addTag}
              onRemove={(tag) => setTags(tags.filter((t) => t !== tag))}
            />
            {serverError && <FormError>{serverError}</FormError>}
            {transaction?.updatedBy && (
              <FieldHint>
                Registrado por{" "}
                {members.find((member) => member.id === transaction.createdBy)
                  ?.name ?? "uma pessoa do casal"}
                . Última alteração por{" "}
                {members.find((member) => member.id === transaction.updatedBy)
                  ?.name ?? "uma pessoa do casal"}
                .
              </FieldHint>
            )}
            <DialogFooter>
              <Button type="button" variant="text" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={17} />
                {saving
                  ? "Salvando…"
                  : transaction
                    ? "Salvar alterações"
                    : "Adicionar transação"}
              </Button>
            </DialogFooter>
          </Fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

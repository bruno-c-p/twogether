import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Repeat2 } from "lucide-react";
import {
  formatAmountInput,
  formText,
  localDate,
  newId,
  normalizeTag,
  parseAmount,
} from "@/features/budget/domain/format";
import type {
  BankAccount,
  Transaction,
  TransactionKind,
  Member,
} from "@/features/budget/domain/types";
import { GoalPicker } from "@/features/budget/components/goal-picker/goal-picker";
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
  const [error, setError] = useState("");

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
    const amount = parseAmount(formText(form, "amount"));
    const description = formText(form, "description").trim();
    const date = formText(form, "date");
    if (!amount) {
      setError("Digite um valor válido, como 45,90.");
      return;
    }
    if (!description) {
      setError("Dê um nome para esta transação.");
      return;
    }
    if (kind === "expense" && !goal) {
      setError("Escolha uma das seis metas para esta despesa.");
      return;
    }
    const accountId = formText(form, "accountId");
    if (!accounts.some((item) => item.id === accountId)) {
      setError(
        accounts.length
          ? "Escolha uma conta bancária."
          : "Cadastre uma conta na aba Contas antes de lançar transações.",
      );
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(new Date(`${date}T12:00:00`).getTime()) ||
      localDate(new Date(`${date}T12:00:00`)) !== date
    ) {
      setError("Escolha uma data válida.");
      return;
    }
    const pendingTag = normalizeTag(tagInput);
    const completeTags =
      pendingTag && !tags.includes(pendingTag)
        ? [...tags, pendingTag].slice(0, 8)
        : tags;
    setSaving(true);
    setError("");
    try {
      if (
        await onSave(
          {
            id: transaction?.id ?? newId(),
            amount,
            description,
            date,
            kind,
            goal: kind === "income" ? null : goal,
            tags: completeTags,
            accountId,
            memberId,
            revision: transaction?.revision,
          },
          recurring && !transaction ? occurrences : 1,
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
            <div className={styles.kindToggle} aria-label="Tipo da transação">
              <button
                type="button"
                className={kind === "expense" ? styles.active : ""}
                aria-pressed={kind === "expense"}
                onClick={() => setKind("expense")}
              >
                <ArrowUpRight size={17} /> Despesa
              </button>
              <button
                type="button"
                className={kind === "income" ? styles.active : ""}
                aria-pressed={kind === "income"}
                onClick={() => {
                  setKind("income");
                  setGoal(null);
                }}
              >
                <ArrowDownLeft size={17} /> Receita
              </button>
            </div>
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
                aria-describedby={error ? "form-error" : undefined}
              />
            </AmountField>
            <FieldRow>
              <label>
                Descrição
                <input
                  name="description"
                  placeholder="Ex.: supermercado"
                  maxLength={80}
                  defaultValue={transaction?.description}
                  required
                />
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
                />
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
            </Field>
            {!transaction && (
              <section
                className={styles.recurrencePanel}
                aria-label="Recorrência"
              >
                <div className={styles.recurrenceHeading}>
                  <span className={styles.recurrenceIcon}>
                    <Repeat2 size={18} />
                  </span>
                  <div className={styles.recurrenceCopy}>
                    <label htmlFor="recurring">Repetir mensalmente</label>
                    <p>Para contas e entradas que se repetem.</p>
                  </div>
                  <input
                    id="recurring"
                    className={styles.recurrenceSwitch}
                    type="checkbox"
                    role="switch"
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                  />
                </div>
                {recurring && (
                  <div className={styles.recurrenceDetails}>
                    <div className={styles.recurrenceCount}>
                      <label htmlFor="occurrences">Por quantos meses?</label>
                      <div className={styles.recurrenceNumber}>
                        <input
                          id="occurrences"
                          type="number"
                          min={2}
                          max={120}
                          required
                          value={Number.isNaN(occurrences) ? "" : occurrences}
                          onChange={(event) =>
                            setOccurrences(event.target.valueAsNumber)
                          }
                          aria-describedby="recurrence-hint"
                        />
                        <span>meses</span>
                      </div>
                    </div>
                    <p id="recurrence-hint">
                      Inclui o mês da primeira transação. Em meses mais curtos,
                      usamos o último dia.
                    </p>
                  </div>
                )}
              </section>
            )}
            {kind === "expense" && (
              <GoalPicker value={goal} onChange={setGoal} />
            )}
            <TagPicker
              tags={tags}
              input={tagInput}
              existingTags={existingTags}
              onInput={setTagInput}
              onAdd={addTag}
              onRemove={(tag) => setTags(tags.filter((t) => t !== tag))}
            />
            {error && <FormError id="form-error">{error}</FormError>}
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

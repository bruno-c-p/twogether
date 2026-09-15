import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Plus, X } from "lucide-react";
import { GOALS } from "../constants";
import {
  formatAmountInput,
  localDate,
  normalizeTag,
  parseAmount,
} from "../services/budget";
import type { Transaction, TransactionKind, Member } from "../types";
import { GoalIcon } from "./goal-icon";

interface Props {
  transaction: Transaction | null;
  defaultDate: string;
  existingTags: string[];
  members: Member[];
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
  currentUserId,
  serverError,
  onSave,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
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
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    amountInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = "";
      if (previous instanceof HTMLElement) previous.focus();
    };
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const amount = parseAmount(String(form.get("amount") ?? ""));
    const description = String(form.get("description") ?? "").trim();
    const date = String(form.get("date") ?? "");
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
    if (
      await onSave(
        {
          id: transaction?.id ?? crypto.randomUUID(),
          amount,
          description,
          date,
          kind,
          goal: kind === "income" ? null : goal,
          tags: completeTags,
          memberId,
          revision: transaction?.revision,
        },
        recurring && !transaction ? occurrences : 1,
      )
    )
      onClose();
    setSaving(false);
  }

  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <div>
            <h2 id="dialog-title">
              {transaction ? "Editar transação" : "Nova transação"}
            </h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        <form onSubmit={submit}>
          <fieldset className="transaction-fields" disabled={saving}>
            <div className="kind-toggle" aria-label="Tipo da transação">
              <button
                type="button"
                className={kind === "expense" ? "active" : ""}
                aria-pressed={kind === "expense"}
                onClick={() => setKind("expense")}
              >
                <ArrowUpRight size={17} /> Despesa
              </button>
              <button
                type="button"
                className={kind === "income" ? "active income" : ""}
                aria-pressed={kind === "income"}
                onClick={() => {
                  setKind("income");
                  setGoal(null);
                }}
              >
                <ArrowDownLeft size={17} /> Receita
              </button>
            </div>
            <label className="amount-label" htmlFor="amount">
              Valor
            </label>
            <div className="amount-input">
              <span>R$</span>
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
            </div>
            <div className="form-row">
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
            </div>
            {!transaction && (
              <div className="goal-field">
                <label>
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                  />
                  Repetir mensalmente
                </label>
                {recurring && (
                  <label>
                    Quantidade de meses (incluindo este)
                    <input
                      type="number"
                      min={2}
                      max={120}
                      required
                      value={occurrences}
                      onChange={(event) =>
                        setOccurrences(event.target.valueAsNumber)
                      }
                    />
                    <span className="account-footnote">
                      Cada ocorrência pode ser editada ou excluída
                      individualmente. Em meses mais curtos, usamos o último dia
                      do mês.
                    </span>
                  </label>
                )}
              </div>
            )}
            {kind === "expense" && (
              <fieldset className="goal-field">
                <legend>Para qual meta?</legend>
                <div className="goal-options">
                  {GOALS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`goal-option ${goal === item.id ? "selected" : ""}`}
                      style={
                        {
                          "--goal-color": item.color,
                          "--goal-bg": item.background,
                        } as React.CSSProperties
                      }
                      aria-pressed={goal === item.id}
                      onClick={() => setGoal(item.id)}
                    >
                      <GoalIcon goal={item.id} size={19} />
                      <span>{item.name}</span>
                      {goal === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <label htmlFor="tag-input">
              Tags <span className="optional">opcional · até 8</span>
            </label>
            <div className="tag-input-wrapper">
              <span>#</span>
              <input
                id="tag-input"
                placeholder="Digite uma tag e pressione Enter"
                value={tagInput}
                maxLength={24}
                disabled={tags.length >= 8}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(tagInput);
                  }
                }}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Adicionar tag"
                disabled={!tagInput.trim() || tags.length >= 8}
                onClick={() => addTag(tagInput)}
              >
                <Plus size={18} />
              </button>
            </div>
            {!!tags.length && (
              <div className="selected-tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag selected-tag"
                    aria-label={`Remover tag ${tag}`}
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    #{tag}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}
            {existingTags.some((tag) => !tags.includes(tag)) &&
              tags.length < 8 && (
                <div className="tag-suggestions">
                  <span>Sugestões</span>
                  {existingTags
                    .filter((tag) => !tags.includes(tag))
                    .slice(0, 5)
                    .map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => addTag(tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                </div>
              )}
            {error && (
              <p id="form-error" role="alert" className="form-error">
                {error}
              </p>
            )}
            {serverError && (
              <p role="alert" className="form-error">
                {serverError}
              </p>
            )}
            {transaction?.updatedBy && (
              <p className="account-footnote">
                Registrado por{" "}
                {members.find((member) => member.id === transaction.createdBy)
                  ?.name ?? "uma pessoa do casal"}
                . Última alteração por{" "}
                {members.find((member) => member.id === transaction.updatedBy)
                  ?.name ?? "uma pessoa do casal"}
                .
              </p>
            )}
            <footer className="dialog-footer">
              <button type="button" className="text-button" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                <Check size={17} />
                {saving
                  ? "Salvando…"
                  : transaction
                    ? "Salvar alterações"
                    : "Adicionar transação"}
              </button>
            </footer>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}

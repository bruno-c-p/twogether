import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowUp, CalendarDays } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import {
  formatAmountInput,
  localDate,
  money,
  newId,
  parseAmount,
} from "@/features/budget/domain/format";
import {
  looksRecurring,
  parsePhrase,
  type PhraseDraft,
} from "@/features/budget/domain/phrase";
import { dateLabel } from "@/features/budget/domain/register-date";
import {
  registerImpact,
  type RegisterImpactData,
} from "@/features/budget/domain/register-impact";
import type {
  BankAccount,
  Member,
  Transaction,
} from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

const OCCURRENCES = 12;

function SheetDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    element?.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      element?.close();
      document.body.style.overflow = overflow;

      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;

    function closeOnBackdrop(event: MouseEvent) {
      if (event.target === element) onClose();
    }

    element?.addEventListener("click", closeOnBackdrop);

    return () => element?.removeEventListener("click", closeOnBackdrop);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      aria-label="Registrar transação"
      onCancel={onClose}
      className={cx(
        "m-auto p-0 w-[560px] max-w-[calc(100vw_-_28px)] max-h-[calc(100dvh_-_40px)]",
        "bg-page text-text border border-solid border-border rounded-[20px] overflow-y-auto",
        "shadow-[0_24px_60px_rgba(23,63,53,.22)]",
        "backdrop:bg-dialog-backdrop backdrop:backdrop-blur-[5px]",
        "max-bp1000:mx-0 max-bp1000:mb-0 max-bp1000:w-full max-bp1000:max-w-full",
        "max-bp1000:max-h-[92dvh] max-bp1000:rounded-b-none max-bp1000:rounded-t-[22px]",
        "max-bp1000:border-b-0",
      )}
    >
      {children}
    </dialog>
  );
}

function Toggle({
  title,
  hint,
  on,
  onChange,
}: {
  title: string;
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const labelId = useId();

  return (
    <div className="flex items-center justify-between gap-[16px]">
      <div className="min-w-0">
        <div id={labelId} className="text-[14px] font-500">
          {title}
        </div>
        <div className="text-[12px] text-text-muted mt-[2px]">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        onClick={() => onChange(!on)}
        className={cx(
          "relative shrink-0 w-[38px] h-[22px] rounded-full border-0 p-0 cursor-pointer",
          on ? "bg-accent" : "bg-text-muted/40",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "absolute top-[3px] left-[3px] w-[16px] h-[16px] rounded-full bg-surface",
            "shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform",
            on && "translate-x-[16px]",
          )}
        />
      </button>
    </div>
  );
}

function DateField({
  value,
  today,
  hint,
  onChange,
}: {
  value: string;
  today: string;
  hint: string;
  onChange: (date: string) => void;
}) {
  return (
    <label
      className={cx(
        "relative inline-flex items-center gap-[7px] text-[14px] text-text-muted",
        "cursor-pointer rounded-[6px] focus-within:outline focus-within:outline-2",
        "focus-within:outline-solid focus-within:outline-green",
      )}
    >
      <CalendarDays size={15} aria-hidden />
      <span>
        {value ? dateLabel(value, today) : "Escolha a data"}
        {hint && <span className="text-[12px]"> · {hint}</span>}
      </span>
      <input
        type="date"
        aria-label="Data"
        value={value}
        min="1900-01-01"
        max="9999-12-31"
        required
        onChange={(event) => onChange(event.currentTarget.value)}
        onClick={(event) => {
          event.currentTarget.showPicker?.();
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}

function AccountSwitch({
  accounts,
  value,
  onChange,
}: {
  accounts: BankAccount[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Conta"
      className="inline-flex p-[3px] gap-[2px] bg-surface-soft rounded-[10px] max-w-full overflow-x-auto"
    >
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          aria-pressed={value === account.id}
          onClick={() => onChange(account.id)}
          className={cx(
            "border-0 rounded-[8px] px-[14px] py-[6px] text-[13px] whitespace-nowrap cursor-pointer",
            value === account.id
              ? "bg-surface text-text font-600 shadow-[0_1px_2px_rgba(0,0,0,.12)]"
              : "bg-transparent text-text-muted",
          )}
        >
          {account.name}
        </button>
      ))}
    </div>
  );
}

function GoalChips({
  value,
  onChange,
}: {
  value: PhraseDraft["goal"];
  onChange: (goal: NonNullable<PhraseDraft["goal"]>) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Meta"
      className={cx(
        "flex flex-wrap gap-[8px]",
        "max-bp1000:flex-nowrap max-bp1000:overflow-x-auto max-bp1000:pb-[4px]",
      )}
    >
      {GOALS.map((goal) => (
        <button
          key={goal.id}
          type="button"
          aria-pressed={value === goal.id}
          onClick={() => onChange(goal.id)}
          style={
            value === goal.id
              ? { background: goal.background, borderColor: goal.color }
              : undefined
          }
          className={cx(
            "inline-flex items-center gap-[7px] shrink-0 whitespace-nowrap cursor-pointer",
            "border border-solid border-border rounded-full bg-surface text-text",
            "px-[13px] py-[7px] text-[13px]",
          )}
        >
          <span
            aria-hidden
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: goal.color }}
          />
          {goal.name}
        </button>
      ))}
    </div>
  );
}

const IMPACT_TONE = {
  over: "bg-danger-soft text-danger",
  ok: "bg-surface-soft text-green",
  neutral: "bg-page text-text-muted border border-solid border-border",
};

type ParsedCardProps = {
  draft: PhraseDraft;
  accounts: BankAccount[];
  members: Member[];
  currentUserId: string;
  month: string;
  today: string;
  serverError: string;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onClose: () => void;
} & RegisterImpactData;

function useParsedDraftForm({
  draft,
  accounts,
  members,
  currentUserId,
  month,
  summary,
  plans,
  onSave,
  onClose,
}: ParsedCardProps) {
  const [amountValue, setAmountValue] = useState(() =>
    formatAmountInput(String(draft.amount)),
  );

  const [description, setDescription] = useState(draft.description);
  const [date, setDate] = useState(draft.date);

  const [accountId, setAccountId] = useState(
    draft.accountId || accounts[0]?.id,
  );

  const [guessed, setGuessed] = useState(!draft.accountId);
  const [goal, setGoal] = useState(draft.goal);
  const [split, setSplit] = useState(draft.split);
  const [recurring, setRecurring] = useState(draft.recurring);
  const [saving, setSaving] = useState(false);

  const expense = draft.kind === "expense";
  const amount = parseAmount(amountValue) ?? 0;
  const partner = members.find((member) => member.id !== currentUserId);
  const canSplit = expense && members.length === 2 && Boolean(partner);

  const valid =
    amount > 0 &&
    description.trim() !== "" &&
    date !== "" &&
    Boolean(accountId) &&
    (!expense || goal !== null);

  const impact = registerImpact({
    kind: draft.kind,
    goal,
    amount,
    date,
    month,
    summary,
    plans,
  });

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!valid || saving || !accountId) return;

    const next: Transaction = {
      id: newId(),
      amount,
      description: description.trim(),
      date,
      kind: draft.kind,
      goal: expense ? goal : null,
      tags: draft.tags,
      accountId,
      memberId: currentUserId,
    };

    if (canSplit && split) next.split = {};

    setSaving(true);

    try {
      if (await onSave(next, recurring ? OCCURRENCES : 1)) onClose();
    } finally {
      setSaving(false);
    }
  }

  function pickAccount(id: string) {
    setAccountId(id);
    setGuessed(false);
  }

  return {
    amountValue,
    setAmountValue,
    description,
    setDescription,
    date,
    setDate,
    accountId,
    pickAccount,
    guessed,
    goal,
    setGoal,
    split,
    setSplit,
    recurring,
    setRecurring,
    saving,
    expense,
    amount,
    partner,
    canSplit,
    valid,
    impact,
    confirm,
  };
}

type ParsedForm = ReturnType<typeof useParsedDraftForm>;

function AmountRow({ form }: { form: ParsedForm }) {
  return (
    <div className="flex items-baseline gap-[12px] flex-wrap">
      <div className="flex items-baseline gap-[6px] font-heading text-[34px] font-700 tracking-[-1px]">
        <span aria-hidden>R$</span>
        <input
          aria-label="Valor"
          inputMode="numeric"
          maxLength={14}
          value={form.amountValue}
          onChange={(event) =>
            form.setAmountValue(formatAmountInput(event.currentTarget.value))
          }
          style={{ width: `${Math.max(form.amountValue.length, 4) + 0.5}ch` }}
          className="border-0 bg-transparent p-0 text-inherit font-inherit tracking-inherit outline-none"
        />
      </div>
      <input
        aria-label="Descrição"
        maxLength={80}
        value={form.description}
        onChange={(event) => form.setDescription(event.currentTarget.value)}
        className="flex-1 min-w-[120px] border-0 bg-transparent p-0 text-[16px] text-text-muted outline-none"
      />
    </div>
  );
}

function DateAccountRow({
  form,
  accounts,
  today,
}: {
  form: ParsedForm;
  accounts: BankAccount[];
  today: string;
}) {
  return (
    <div className="flex items-center justify-between gap-[12px] flex-wrap">
      <DateField
        value={form.date}
        today={today}
        hint={form.guessed && accounts.length > 1 ? "conta sugerida" : ""}
        onChange={form.setDate}
      />
      {accounts.length > 1 && form.accountId && (
        <AccountSwitch
          accounts={accounts}
          value={form.accountId}
          onChange={form.pickAccount}
        />
      )}
    </div>
  );
}

function ParsedToggles({
  form,
  description,
}: {
  form: ParsedForm;
  description: string;
}) {
  const { partner, split, recurring } = form;

  return (
    <>
      {form.canSplit && partner && (
        <Toggle
          title={`Dividir com ${partner.name}`}
          hint={
            split
              ? `${partner.name} fica com ${money(Math.round(form.amount / 2))}.`
              : "Metade fica com cada pessoa."
          }
          on={split}
          onChange={form.setSplit}
        />
      )}
      <Toggle
        title="Repetir todo mês"
        hint={
          recurring
            ? `Repete por ${OCCURRENCES} meses, a partir desta data.`
            : looksRecurring(description)
              ? "Parece uma conta mensal."
              : "Para contas que se repetem."
        }
        on={recurring}
        onChange={form.setRecurring}
      />
    </>
  );
}

function ParsedFooter({
  form,
  serverError,
  onClose,
}: {
  form: ParsedForm;
  serverError: string;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="status"
        className={cx(
          "rounded-[10px] px-[14px] py-[11px] text-[13px]",
          IMPACT_TONE[form.impact.tone],
        )}
      >
        {form.impact.text}
      </div>
      {serverError && (
        <p role="alert" className="m-0 text-danger text-[13px]">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={!form.valid || form.saving}
        className={cx(
          "border-0 rounded-[12px] bg-green text-on-brand min-h-[48px] px-[20px]",
          "text-[15px] font-600 cursor-pointer hover:bg-brand-hover",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {form.saving ? "Salvando…" : `Confirmar ${money(form.amount)}`}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="border-0 bg-transparent text-text-muted text-[13px] cursor-pointer p-[4px]"
      >
        Cancelar
      </button>
    </>
  );
}

function ParsedCard(props: ParsedCardProps) {
  const form = useParsedDraftForm(props);

  return (
    <form
      onSubmit={(event) => void form.confirm(event)}
      className="bg-surface border border-solid border-border rounded-[16px] p-[20px] grid gap-[16px]"
    >
      <AmountRow form={form} />
      <DateAccountRow
        form={form}
        accounts={props.accounts}
        today={props.today}
      />
      {form.expense && <GoalChips value={form.goal} onChange={form.setGoal} />}
      <ParsedToggles form={form} description={form.description} />
      <ParsedFooter
        form={form}
        serverError={props.serverError}
        onClose={props.onClose}
      />
    </form>
  );
}

function PhraseInput({
  accounts,
  onParsed,
  onManual,
}: {
  accounts: BankAccount[];
  onParsed: (draft: PhraseDraft) => void;
  onManual: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = parsePhrase(text, accounts);

    if ("error" in result) {
      setError(result.error);

      return;
    }

    setError("");
    setText("");
    onParsed(result.draft);
  }

  return (
    <div className="grid gap-[8px]">
      {error && (
        <p
          id="register-phrase-error"
          role="alert"
          className="m-0 text-danger text-[13px]"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={submit}
        className={cx(
          "flex items-center gap-[8px] bg-surface border border-solid border-border",
          "rounded-full py-[6px] pl-[18px] pr-[6px] focus-within:border-green",
        )}
      >
        <input
          ref={input}
          aria-label="Descreva o que aconteceu"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "register-phrase-error" : undefined}
          maxLength={120}
          placeholder="Gastei 300 reais de condomínio"
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value);
            setError("");
          }}
          className="flex-1 min-w-0 h-[38px] border-0 bg-transparent outline-none text-text text-[16px]"
        />
        <button
          type="submit"
          aria-label="Enviar frase"
          disabled={!text.trim()}
          className={cx(
            "w-[40px] h-[40px] shrink-0 rounded-full border-0 bg-green text-on-brand",
            "inline-flex items-center justify-center cursor-pointer disabled:opacity-50",
          )}
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
      <button
        type="button"
        onClick={onManual}
        className="border-0 bg-transparent text-text-muted text-[13px] underline underline-offset-[3px] cursor-pointer p-[4px]"
      >
        Preencher manualmente
      </button>
    </div>
  );
}

export function RegisterSheet({
  initialDraft,
  today = localDate(),
  accounts,
  onManual,
  onClose,
  ...card
}: {
  initialDraft?: PhraseDraft;
  today?: string;
  accounts: BankAccount[];
  members: Member[];
  currentUserId: string;
  month: string;
  serverError: string;
  onSave: (transaction: Transaction, occurrences?: number) => Promise<boolean>;
  onManual: () => void;
  onClose: () => void;
} & RegisterImpactData) {
  const [draft, setDraft] = useState(initialDraft);
  const [revision, setRevision] = useState(0);

  return (
    <SheetDialog onClose={onClose}>
      <div className="p-[22px] max-bp620:p-[16px] grid gap-[14px]">
        <div
          aria-hidden
          className="hidden max-bp1000:block w-[40px] h-[4px] rounded-full bg-border mx-auto"
        />
        <h2 className="m-0 font-heading text-[22px] font-600 tracking-[-.5px]">
          O que aconteceu?
        </h2>
        {draft?.phrase && (
          <p
            className={cx(
              "m-0 ml-auto max-w-[85%] bg-green text-on-brand rounded-[16px]",
              "rounded-br-[5px] px-[16px] py-[10px] text-[14px] break-words",
            )}
          >
            {draft.phrase}
          </p>
        )}
        {draft && (
          <ParsedCard
            key={revision}
            draft={draft}
            accounts={accounts}
            today={today}
            onClose={onClose}
            {...card}
          />
        )}
        {!initialDraft && (
          <PhraseInput
            accounts={accounts}
            onManual={onManual}
            onParsed={(next) => {
              setDraft(next);
              setRevision(revision + 1);
            }}
          />
        )}
      </div>
    </SheetDialog>
  );
}

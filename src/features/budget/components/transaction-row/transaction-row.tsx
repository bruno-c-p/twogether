import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type {
  BankAccount,
  Member,
  Transaction,
} from "@/features/budget/domain/types";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/ui/color-dot";
import styles from "@/features/budget/components/transaction-row/transaction-row.module.css";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

type Goal = (typeof GOALS)[number];

function dayLabel(date: string) {
  return dayFormatter
    .format(new Date(`${date}T12:00:00`))
    .replace(" de ", " ")
    .replace(".", "");
}

function amountLabel(transaction: Transaction, hidden: boolean) {
  if (hidden) return "R$ ••••";

  return `${transaction.kind === "income" ? "+" : "−"} ${money(transaction.amount)}`;
}

function splitLabel(t: Transaction, userId: string) {
  if (t.settlementOf) return t.kind === "income" ? "Reembolso" : "Parte paga";

  if (!t.split) return "";

  if (t.split.paidAt) return "Dividida · paga";

  return t.memberId === userId ? "Dividida · a receber" : "Dividida · a pagar";
}

const REPAYMENT_LOCK = "reembolso: desmarque o pagamento na transação original";

// Repayments are edited through the original split; a paid split must be
// unmarked before it can be deleted.
function deleteLock(t: Transaction) {
  if (t.settlementOf) return REPAYMENT_LOCK;

  return t.split?.paidAt ? "desmarque o pagamento antes" : "";
}

function withLock(label: string, lock: string) {
  return lock ? `${label} (${lock})` : label;
}

function TransactionIcon({
  kind,
  goal,
}: {
  kind: Transaction["kind"];
  goal: Goal | undefined;
}) {
  const income = kind === "income";

  return (
    <span
      className={`${styles.transactionIcon} ${income ? styles.incomeIcon : ""}`}
      style={
        goal ? { background: goal.background, color: goal.color } : undefined
      }
    >
      {income && <ArrowDownLeft size={20} />}
      {!income && goal && <GoalIcon goal={goal.id} />}
      {!income && !goal && <ArrowUpRight size={20} />}
    </span>
  );
}

function TransactionTags({
  tags,
  onTag,
}: {
  tags: string[];
  onTag: (tag: string) => void;
}) {
  if (!tags.length)
    return (
      <div className={styles.rowTags}>
        <span>Sem tags</span>
      </div>
    );

  return (
    <div className={styles.rowTags}>
      {tags.map((tag) => (
        <button key={tag} onClick={() => onTag(tag)}>
          #{tag}
        </button>
      ))}
    </div>
  );
}

function GoalBadge({ goal }: { goal: Goal | undefined }) {
  if (!goal) return <span className={styles.incomeLabel}>Receita</span>;

  return (
    <span
      className={styles.goalBadge}
      style={{ background: goal.background, color: goal.color }}
    >
      <ColorDot className={styles.goalDot} style={{ background: goal.color }} />
      {goal.name}
    </span>
  );
}

function RowPerson({
  transaction,
  members,
  accounts,
  userId,
}: {
  transaction: Transaction;
  members: Member[];
  accounts: BankAccount[];
  userId: string;
}) {
  const person =
    members.find((member) => member.id === transaction.memberId)?.name ??
    "Pessoa do casal";

  const account =
    accounts.find((item) => item.id === transaction.accountId)?.name ??
    "Sem conta";

  const label = splitLabel(transaction, userId);

  return (
    <div className={styles.transactionPerson}>
      {person}
      {" · "}
      {account}
      {label && (
        <>
          {" · "}
          <span className="text-text-muted">{label}</span>
        </>
      )}
    </div>
  );
}

export function TransactionRow({
  transaction,
  members,
  accounts,
  userId,
  busy,
  hidden,
  className,
  onEdit,
  onDelete,
  onTag,
}: {
  transaction: Transaction;
  members: Member[];
  accounts: BankAccount[];
  userId: string;
  busy: boolean;
  hidden: boolean;
  className?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onTag: (tag: string) => void;
}) {
  const t = transaction;
  const goal = GOALS.find((g) => g.id === t.goal);

  const tone = t.kind === "income" ? styles.positive : styles.negative;
  const editLock = t.settlementOf ? REPAYMENT_LOCK : "";
  const removeLock = deleteLock(t);

  return (
    <div className={className ? `${styles.row} ${className}` : styles.row}>
      <div className={styles.transactionDescription}>
        <TransactionIcon kind={t.kind} goal={goal} />
        <div>
          <button
            className={styles.transactionName}
            disabled={busy || Boolean(editLock)}
            title={editLock || undefined}
            onClick={() => onEdit(t)}
          >
            {t.description}
          </button>
          <RowPerson
            transaction={t}
            members={members}
            accounts={accounts}
            userId={userId}
          />
          <TransactionTags tags={t.tags} onTag={onTag} />
        </div>
      </div>
      <div className={styles.transactionGoal}>
        <GoalBadge goal={goal} />
      </div>
      <time className={styles.transactionDate} dateTime={t.date}>
        {dayLabel(t.date)}
      </time>
      <span className={`${styles.transactionValue} ${tone}`}>
        {amountLabel(t, hidden)}
      </span>
      <div className={styles.rowActions}>
        <Button
          variant="icon"
          className={styles.actionButton}
          disabled={busy || Boolean(editLock)}
          aria-label={withLock(`Editar ${t.description}`, editLock)}
          onClick={() => onEdit(t)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="icon"
          className={`${styles.actionButton} ${styles.deleteButton}`}
          disabled={busy || Boolean(removeLock)}
          aria-label={withLock(`Excluir ${t.description}`, removeLock)}
          onClick={() => onDelete(t)}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

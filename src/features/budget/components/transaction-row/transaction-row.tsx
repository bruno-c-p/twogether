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
  const date = new Date(`${t.date}T12:00:00`);
  const repayment = Boolean(t.settlementOf);
  const paidSplit = Boolean(t.split?.paidAt);
  const splitLabel = repayment
    ? t.kind === "income"
      ? "Reembolso"
      : "Parte paga"
    : t.split
      ? paidSplit
        ? "Dividida · paga"
        : t.memberId === userId
          ? "Dividida · a receber"
          : "Dividida · a pagar"
      : "";
  const lockedLabel = repayment
    ? "reembolso: desmarque o pagamento na transação original"
    : "";
  return (
    <div className={className ? `${styles.row} ${className}` : styles.row}>
      <div className={styles.transactionDescription}>
        <span
          className={`${styles.transactionIcon} ${t.kind === "income" ? styles.incomeIcon : ""}`}
          style={
            goal
              ? { background: goal.background, color: goal.color }
              : undefined
          }
        >
          {t.kind === "income" ? (
            <ArrowDownLeft size={20} />
          ) : goal ? (
            <GoalIcon goal={goal.id} />
          ) : (
            <ArrowUpRight size={20} />
          )}
        </span>
        <div>
          <button
            className={styles.transactionName}
            disabled={busy || repayment}
            title={lockedLabel || undefined}
            onClick={() => onEdit(t)}
          >
            {t.description}
          </button>
          <div className={styles.transactionPerson}>
            {members.find((member) => member.id === t.memberId)?.name ??
              "Pessoa do casal"}
            {" · "}
            {accounts.find((account) => account.id === t.accountId)?.name ??
              "Sem conta"}
            {splitLabel && (
              <>
                {" · "}
                <span className="text-text-muted">{splitLabel}</span>
              </>
            )}
          </div>
          <div className={styles.rowTags}>
            {t.tags.length ? (
              t.tags.map((tag) => (
                <button key={tag} onClick={() => onTag(tag)}>
                  #{tag}
                </button>
              ))
            ) : (
              <span>Sem tags</span>
            )}
          </div>
        </div>
      </div>
      <div className={styles.transactionGoal}>
        {goal ? (
          <span
            className={styles.goalBadge}
            style={{ background: goal.background, color: goal.color }}
          >
            <ColorDot
              className={styles.goalDot}
              style={{ background: goal.color }}
            />
            {goal.name}
          </span>
        ) : (
          <span className={styles.incomeLabel}>Receita</span>
        )}
      </div>
      <time className={styles.transactionDate} dateTime={t.date}>
        {dayFormatter.format(date).replace(" de ", " ").replace(".", "")}
      </time>
      <span
        className={`${styles.transactionValue} ${t.kind === "income" ? styles.positive : styles.negative}`}
      >
        {hidden
          ? "R$ ••••"
          : `${t.kind === "income" ? "+" : "−"} ${money(t.amount)}`}
      </span>
      <div className={styles.rowActions}>
        <Button
          variant="icon"
          className={styles.actionButton}
          disabled={busy || repayment}
          aria-label={
            lockedLabel
              ? `Editar ${t.description} (${lockedLabel})`
              : `Editar ${t.description}`
          }
          onClick={() => onEdit(t)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="icon"
          className={`${styles.actionButton} ${styles.deleteButton}`}
          disabled={busy || repayment || paidSplit}
          aria-label={
            lockedLabel
              ? `Excluir ${t.description} (${lockedLabel})`
              : paidSplit
                ? `Excluir ${t.description} (desmarque o pagamento antes)`
                : `Excluir ${t.description}`
          }
          onClick={() => onDelete(t)}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

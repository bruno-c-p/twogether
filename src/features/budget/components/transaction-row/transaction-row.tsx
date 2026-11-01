import { Pencil, Trash2 } from "lucide-react";
import { AMOUNT_STYLE } from "@/features/budget/components/amount-style";
import { GOALS, KINDS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import {
  transactionStatus,
  type TransactionStatus,
} from "@/features/budget/domain/status";
import { deleteLock, editLock } from "@/features/budget/domain/view";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/ui/color-dot";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { cx } from "@/lib/cx";

function amountLabel(transaction: Transaction, hidden: boolean) {
  if (hidden) return "R$ ••••";

  return `${AMOUNT_STYLE[transaction.kind].sign}${money(transaction.amount)}`;
}

function splitLabel(t: Transaction, status: TransactionStatus) {
  if (status.repayment) return t.kind === "income" ? "reembolso" : "parte paga";

  if (!status.split) return "";

  if (status.paidAt) return "dividida · paga";

  return status.userOwes ? "dividida · a pagar" : "dividida · a receber";
}

function withLock(label: string, lock: string) {
  return lock ? `${label} (${lock})` : label;
}

function PayerAvatar({
  members,
  memberId,
}: {
  members: Member[];
  memberId: string | undefined;
}) {
  const index = members.findIndex((member) => member.id === memberId);
  const name = members[index]?.name;

  return (
    <PersonAvatar
      title={name ?? "Pessoa do casal"}
      name={name}
      position={index}
      className="w-[32px] h-[32px] text-xs"
    />
  );
}

// The goal with its color; `suffix` joins the same truncating line.
function GoalLabel({
  transaction,
  suffix = "",
}: {
  transaction: Transaction;
  suffix?: string;
}) {
  const goal = GOALS.find((g) => g.id === transaction.goal);

  return (
    <>
      <ColorDot
        className="w-[7px] h-[7px]"
        style={{ background: goal?.color ?? "var(--brand)" }}
      />
      <span className="truncate">
        {transaction.kind === "expense"
          ? goal?.name
          : KINDS[transaction.kind].label}
        {suffix && ` · ${suffix}`}
      </span>
    </>
  );
}

/**
 * Phones: two lines (description, then goal and split status) with the
 * amount on the right; the whole row opens the edit dialog, which is also
 * where delete lives. From bp1000 the row spreads into columns and keeps
 * the edit and delete icons.
 */
export function TransactionRow({
  transaction,
  members,
  userId,
  busy,
  hidden,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  members: Member[];
  userId: string;
  busy: boolean;
  hidden: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const t = transaction;
  const state = transactionStatus(t, userId);
  const status = splitLabel(t, state);
  const lock = editLock(state);
  const removeLock = deleteLock(state);

  return (
    <li
      className={cx(
        "relative grid items-center gap-x-3 min-h-[62px] px-4 py-2.5 @hover:bg-surface-2 active:bg-surface-2",
        "grid-cols-[32px_minmax(0,1fr)_auto] bp1000:grid-cols-[32px_minmax(0,1fr)_200px_150px_68px] bp1000:min-h-[56px]",
        "[&+&]:before:content-[''] [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:left-[60px] [&+&]:before:right-0 [&+&]:before:h-px [&+&]:before:bg-border",
      )}
    >
      <PayerAvatar members={members} memberId={t.memberId} />
      <div className="min-w-0 grid gap-0.5 bp1000:flex bp1000:items-baseline bp1000:gap-2">
        {/* Stretched over the whole row, so any tap on it edits. The global
            press scale would make the button the ::after's containing block,
            shrinking the target mid-press, so this button does not scale. */}
        <Button
          variant="unstyled"
          className={cx(
            "block max-w-full truncate border-0 bg-transparent p-0 text-left text-md font-500 text-text",
            "after:content-[''] after:absolute after:inset-0 active:![transform:none] disabled:opacity-100 disabled:cursor-default",
          )}
          disabled={busy || Boolean(lock)}
          title={lock || undefined}
          onClick={() => onEdit(t)}
        >
          {t.description}
        </Button>
        {status && (
          <span className="hidden bp1000:inline shrink-0 text-xs text-text-muted">
            {status}
          </span>
        )}
        <span className="flex items-center gap-1.5 min-w-0 text-xs text-text-muted bp1000:hidden">
          <GoalLabel transaction={t} suffix={status} />
        </span>
      </div>
      <span className="hidden bp1000:flex items-center gap-2 min-w-0 text-sm text-text">
        <GoalLabel transaction={t} />
      </span>
      <span
        className={cx(
          "text-md font-600 whitespace-nowrap tabular-nums bp1000:text-right",
          hidden ? "text-text" : AMOUNT_STYLE[t.kind].color,
        )}
      >
        {amountLabel(t, hidden)}
      </span>
      <div className="relative hidden bp1000:flex justify-end gap-1">
        <Button
          variant="icon"
          className="text-text-muted"
          disabled={busy || Boolean(lock)}
          aria-label={withLock(`Editar ${t.description}`, lock)}
          onClick={() => onEdit(t)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="icon"
          className="text-text-muted @hover:text-danger"
          disabled={busy || Boolean(removeLock)}
          aria-label={withLock(`Excluir ${t.description}`, removeLock)}
          onClick={() => onDelete(t)}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </li>
  );
}

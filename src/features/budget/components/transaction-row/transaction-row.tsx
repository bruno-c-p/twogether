import { Pencil, Trash2 } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/ui/color-dot";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { cx } from "@/lib/cx";

function amountLabel(transaction: Transaction, hidden: boolean) {
  if (hidden) return "R$ ••••";

  return `${transaction.kind === "income" ? "+" : "−"} ${money(transaction.amount)}`;
}

function splitLabel(t: Transaction, userId: string) {
  if (t.settlementOf) return t.kind === "income" ? "reembolso" : "parte paga";

  if (!t.split) return "";

  if (t.split.paidAt) return "dividida · paga";

  return t.memberId === userId ? "dividida · a receber" : "dividida · a pagar";
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
      className="w-[26px] h-[26px] text-xs max-bp1000:row-span-2 max-bp620:row-span-1"
    />
  );
}

export function TransactionRow({
  transaction,
  members,
  userId,
  busy,
  hidden,
  onEdit,
  onDelete,
  onTag,
}: {
  transaction: Transaction;
  members: Member[];
  userId: string;
  busy: boolean;
  hidden: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onTag: (tag: string) => void;
}) {
  const t = transaction;
  const goal = GOALS.find((g) => g.id === t.goal);
  const status = splitLabel(t, userId);
  const editLock = t.settlementOf ? REPAYMENT_LOCK : "";
  const removeLock = deleteLock(t);

  return (
    <div
      className={cx(
        "grid items-center gap-x-4 px-6 py-3 border-0 border-t border-solid border-border",
        "grid-cols-[26px_minmax(0,1fr)_210px_130px_64px]",
        "max-bp1000:grid-cols-[26px_minmax(0,1fr)_auto] max-bp1000:gap-y-0.5 max-bp1000:px-4 max-bp620:gap-y-2",
      )}
    >
      <PayerAvatar members={members} memberId={t.memberId} />
      <div className="min-w-0 flex items-baseline gap-2 flex-wrap max-bp620:col-span-2">
        <button
          className="border-0 bg-transparent p-0 text-left text-md text-text min-w-0 break-words disabled:cursor-default"
          disabled={busy || Boolean(editLock)}
          title={editLock || undefined}
          onClick={() => onEdit(t)}
        >
          {t.description}
        </button>
        {t.tags.map((tag) => (
          <button
            key={tag}
            className="border-0 bg-transparent p-0 text-xs text-text-muted hover:text-text [overflow-wrap:anywhere]"
            onClick={() => onTag(tag)}
          >
            #{tag}
          </button>
        ))}
        {status && <span className="text-xs text-text-muted">{status}</span>}
      </div>
      <div
        className={cx(
          "contents text-sm text-text-muted",
          "max-bp1000:col-start-2 max-bp1000:row-start-2 max-bp1000:flex max-bp1000:flex-wrap max-bp1000:items-center max-bp1000:gap-x-1.5 max-bp1000:min-w-0 max-bp620:col-span-2",
        )}
      >
        {goal ? (
          <span className="inline-flex items-center gap-2 min-w-0 text-text max-bp1000:text-text-muted">
            <ColorDot
              className="w-[7px] h-[7px]"
              style={{ background: goal.color }}
            />
            <span className="break-words min-w-0">{goal.name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 min-w-0 text-text max-bp1000:text-text-muted">
            <ColorDot className="bg-brand" />
            Receita
          </span>
        )}
      </div>
      <span
        className={cx(
          "text-right text-md font-600 whitespace-nowrap tabular-nums text-text",
          "max-bp1000:col-start-3 max-bp1000:row-start-1 max-bp1000:text-md max-bp620:col-start-2 max-bp620:row-start-3 max-bp620:text-left",
        )}
      >
        {amountLabel(t, hidden)}
      </span>
      <div className="flex justify-end max-bp1000:col-start-3 max-bp1000:row-start-2 max-bp620:row-start-3">
        <Button
          variant="icon"
          className="w-[28px] h-[28px] text-text-muted max-bp1000:hidden"
          disabled={busy || Boolean(editLock)}
          aria-label={withLock(`Editar ${t.description}`, editLock)}
          onClick={() => onEdit(t)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="icon"
          className="w-[28px] h-[28px] text-text-muted hover:text-danger"
          disabled={busy || Boolean(removeLock)}
          aria-label={withLock(`Excluir ${t.description}`, removeLock)}
          onClick={() => onDelete(t)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

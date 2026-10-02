import { Pencil, Trash2 } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type {
  BankAccount,
  Member,
  Transaction,
} from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/ui/color-dot";
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
  const name = members[index]?.name ?? "Pessoa do casal";

  return (
    <span
      title={name}
      className={cx(
        "w-[26px] h-[26px] rounded-full inline-flex items-center justify-center",
        "text-[11px] font-600 shrink-0 max-bp1000:row-span-2",
        index === -1 && "bg-surface-soft text-text-muted",
        index === 0 && "bg-green text-on-brand",
        index > 0 && "bg-category-pleasure text-on-brand",
      )}
    >
      {index === -1 ? "?" : name.slice(0, 1).toLocaleUpperCase("pt-BR")}
    </span>
  );
}

export function TransactionRow({
  transaction,
  members,
  accounts,
  userId,
  busy,
  hidden,
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
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onTag: (tag: string) => void;
}) {
  const t = transaction;
  const goal = GOALS.find((g) => g.id === t.goal);
  const account = accounts.find((item) => item.id === t.accountId)?.name;
  const status = splitLabel(t, userId);
  const editLock = t.settlementOf ? REPAYMENT_LOCK : "";
  const removeLock = deleteLock(t);

  return (
    <div
      className={cx(
        "grid items-center gap-x-[14px] px-[24px] py-[13px] border-0 border-t border-solid border-border",
        "grid-cols-[26px_minmax(0,1fr)_210px_120px_130px_64px]",
        "max-bp1000:grid-cols-[26px_minmax(0,1fr)_auto] max-bp1000:gap-y-[2px] max-bp1000:px-[16px]",
      )}
    >
      <PayerAvatar members={members} memberId={t.memberId} />
      <div className="min-w-0 flex items-baseline gap-[8px] flex-wrap">
        <button
          className="border-0 bg-transparent p-0 text-left text-[15px] text-text min-w-0 break-words disabled:cursor-default"
          disabled={busy || Boolean(editLock)}
          title={editLock || undefined}
          onClick={() => onEdit(t)}
        >
          {t.description}
        </button>
        {t.tags.map((tag) => (
          <button
            key={tag}
            className="border-0 bg-transparent p-0 text-[12px] text-text-muted hover:text-text"
            onClick={() => onTag(tag)}
          >
            #{tag}
          </button>
        ))}
        {status && (
          <span className="text-[12px] text-text-muted">{status}</span>
        )}
      </div>
      <div
        className={cx(
          "contents text-[13px] text-text-muted",
          "max-bp1000:col-start-2 max-bp1000:row-start-2 max-bp1000:flex max-bp1000:flex-wrap max-bp1000:items-center max-bp1000:gap-x-[6px] max-bp1000:min-w-0",
        )}
      >
        {goal ? (
          <span className="inline-flex items-center gap-[8px] min-w-0 text-text max-bp1000:text-text-muted">
            <ColorDot
              className="w-[7px] h-[7px]"
              style={{ background: goal.color }}
            />
            <span className="break-words min-w-0">{goal.name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-[8px] min-w-0 text-text max-bp1000:text-text-muted">
            <ColorDot className="w-[7px] h-[7px] bg-green" />
            Receita
          </span>
        )}
        <span aria-hidden="true" className="bp1000:hidden">
          ·
        </span>
        <span className="break-words min-w-0">{account ?? "Sem conta"}</span>
      </div>
      <span
        className={cx(
          "text-right text-[15px] font-600 whitespace-nowrap tabular-nums text-text",
          "max-bp1000:col-start-3 max-bp1000:row-start-1 max-bp1000:text-[14px]",
        )}
      >
        {amountLabel(t, hidden)}
      </span>
      <div className="flex justify-end max-bp1000:col-start-3 max-bp1000:row-start-2">
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

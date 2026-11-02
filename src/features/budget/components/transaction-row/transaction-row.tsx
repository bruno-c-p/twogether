import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Button } from "@/components/glaze/ui/button";
import { Edit, Icon, TrashCan } from "@/components/glaze/icon";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemMeta,
  ItemTitle,
} from "@/components/glaze/ui/item";
import { AMOUNT_STYLE } from "@/features/budget/components/amount-style";
import { GOALS, KINDS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import {
  transactionStatus,
  type TransactionStatus,
} from "@/features/budget/domain/status";
import { deleteLock, editLock } from "@/features/budget/domain/view";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { PersonAvatar } from "@/components/app/person-avatar";
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
      className="size-8"
    />
  );
}

// The goal by name, or the kind for income and transfers.
function goalLabel(transaction: Transaction) {
  return transaction.kind === "expense"
    ? GOALS.find((g) => g.id === transaction.goal)?.name
    : KINDS[transaction.kind].label;
}

/**
 * Phones: two lines (description, then goal and split status) with the
 * amount on the right; the whole row opens the edit dialog, which is also
 * where delete lives. From lg the goal gets its own column and the row
 * keeps the edit and delete icons.
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
  const goal = goalLabel(t);

  return (
    <Item className="min-h-14">
      <ItemMedia>
        <PayerAvatar members={members} memberId={t.memberId} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {/* Glaze's row link, as a button: its hit area covers the row,
              so any tap on it edits. */}
          <ButtonPrimitive
            data-slot="item-link"
            data-control=""
            className="min-w-0 truncate text-start after:absolute after:inset-0 after:content-[''] disabled:cursor-default"
            disabled={busy || Boolean(lock)}
            title={lock || undefined}
            onClick={() => onEdit(t)}
          >
            {t.description}
          </ButtonPrimitive>
          {status && (
            <span className="hidden shrink-0 type-caption text-text-2 lg:inline">
              {status}
            </span>
          )}
        </ItemTitle>
        <ItemDescription className="truncate lg:hidden">
          {goal}
          {status && ` · ${status}`}
        </ItemDescription>
      </ItemContent>
      <ItemMeta className="hidden w-48 truncate type-body-sm text-text-1 lg:block">
        {goal}
      </ItemMeta>
      <span
        className={cx(
          "shrink-0 type-label whitespace-nowrap tabular-nums lg:w-36 lg:text-end",
          hidden ? "text-text-1" : AMOUNT_STYLE[t.kind].color,
        )}
      >
        {amountLabel(t, hidden)}
      </span>
      <ItemActions className="hidden lg:flex">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy || Boolean(lock)}
          aria-label={withLock(`Editar ${t.description}`, lock)}
          onClick={() => onEdit(t)}
        >
          <Icon icon={Edit} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy || Boolean(removeLock)}
          aria-label={withLock(`Excluir ${t.description}`, removeLock)}
          onClick={() => onDelete(t)}
        >
          <Icon icon={TrashCan} />
        </Button>
      </ItemActions>
    </Item>
  );
}

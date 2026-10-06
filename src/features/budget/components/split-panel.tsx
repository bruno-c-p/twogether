import { useId } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, shortDay } from "@/features/budget/domain/format";
import { partnerShare } from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

const capitalize = (value: string) =>
  value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);

function splitHint(
  transaction: Transaction | null,
  checked: boolean,
  share: number,
  names: { payer: string; debtor: string },
) {
  if (transaction?.split?.paidAt)
    return "Pagamento registrado. Valor, tipo e divisão ficam travados enquanto estiver pago.";

  if (checked && share)
    return capitalize(`${names.debtor} deve ${money(share)} a ${names.payer}.`);

  return "Metade fica com cada pessoa.";
}

function settlementStatus(
  transaction: Transaction,
  debtorName: string,
  userIsDebtor: boolean,
) {
  const paidAt = transaction.split?.paidAt;

  if (paidAt) {
    return `Pago por ${debtorName} em ${shortDay(paidAt)}.`;
  }

  return userIsDebtor
    ? `Você deve ${money(partnerShare(transaction.amount))}.`
    : `Aguardando ${debtorName}.`;
}

function SettlementRow({
  transaction,
  debtorName,
  userIsDebtor,
  busy,
  onSettle,
  onUnsettle,
}: {
  transaction: Transaction;
  debtorName: string;
  userIsDebtor: boolean;
  busy: boolean;
  onSettle: () => void;
  onUnsettle: () => void;
}) {
  const paid = Boolean(transaction.split?.paidAt);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 [border-top:1px_solid_var(--line)] text-xs">
      <span className="text-text-muted leading-[1.6]">
        {settlementStatus(transaction, debtorName, userIsDebtor)}
      </span>
      {userIsDebtor && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={paid ? onUnsettle : onSettle}
        >
          {paid ? "Desmarcar pagamento" : "Marcar como pago"}
        </Button>
      )}
    </div>
  );
}

export function SplitPanel({
  checked,
  amount,
  transaction,
  title,
  payerName,
  debtorName,
  userIsDebtor,
  busy,
  onChange,
  onSettle,
  onUnsettle,
}: {
  checked: boolean;
  amount: number;
  transaction: Transaction | null;
  title: string;
  payerName: string;
  debtorName: string;
  userIsDebtor: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
  onSettle: () => void;
  onUnsettle: () => void;
}) {
  const paidAt = transaction?.split?.paidAt;
  const share = amount >= 2 ? partnerShare(amount) : 0;
  const id = useId();

  return (
    <section
      aria-label="Divisão"
      className="mb-6 border border-solid border-border rounded-md bg-surface-soft"
    >
      <div
        className={cx(
          "flex items-center gap-3 p-4",
          "max-bp620:p-4 max-bp620:gap-2",
        )}
      >
        <span className="flex text-text-muted max-bp620:hidden">
          <Users size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <label
            htmlFor={`${id}-switch`}
            className="!block !text-sm font-500 !mb-1 cursor-pointer"
          >
            {title}
          </label>
          <span
            id={`${id}-hint`}
            className="block text-text-muted text-xs leading-[1.6]"
          >
            {splitHint(transaction, checked, share, {
              payer: payerName,
              debtor: debtorName,
            })}
          </span>
        </span>
        <input
          id={`${id}-switch`}
          aria-describedby={`${id}-hint`}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={Boolean(paidAt)}
          onChange={(event) => onChange(event.target.checked)}
          className={cx(
            "appearance-none shrink-0 w-[38px] h-[22px] rounded-full relative cursor-pointer m-0",
            "border border-solid border-border bg-surface",
            "after:content-empty after:absolute after:top-[3px] after:left-[3px]",
            "after:w-[14px] after:h-[14px] after:rounded-full after:bg-text-muted",
            "after:transition-transform after:duration-150",
            "checked:bg-accent checked:border-accent",
            "checked:after:translate-x-[16px] checked:after:bg-on-brand",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        />
      </div>
      {transaction?.split && (
        <SettlementRow
          transaction={transaction}
          debtorName={debtorName}
          userIsDebtor={userIsDebtor}
          busy={busy}
          onSettle={onSettle}
          onUnsettle={onUnsettle}
        />
      )}
    </section>
  );
}

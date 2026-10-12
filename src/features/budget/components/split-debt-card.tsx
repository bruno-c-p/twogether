import { Collapsible } from "@base-ui/react/collapsible";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverviewCard } from "@/features/budget/components/overview-card";
import { shortDay } from "@/features/budget/domain/format";
import { partnerShare, type splitDebt } from "@/features/budget/domain/split";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

function headline(net: number, open: number, partner: Member, money: string) {
  if (net > 0) return `${partner.name} te deve ${money}`;

  if (net < 0) return `Você deve ${money} a ${partner.name}`;

  return open ? "Vocês estão quites" : "Nada pendente entre vocês";
}

function detail(open: number, waiting: boolean, partner: Member) {
  if (!open)
    return `Ative “Dividir com ${partner.name}” ao lançar uma despesa.`;

  const count =
    open === 1
      ? "1 despesa dividida em aberto"
      : `${open} despesas divididas em aberto`;

  return waiting ? `${count} · aguardando ${partner.name}` : count;
}

type Debt = ReturnType<typeof splitDebt>;

const cardLayout = cx(
  "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4 items-center",
  "max-bp620:grid-cols-[auto_minmax(0,1fr)]",
);

export function SplitDebtCard({
  debt,
  ...props
}: {
  // Null until hydration, when the reader's date decides what is owed.
  debt: Debt | null;
  userId: string;
  partner: Member;
  busy: boolean;
  displayMoney: (value: number) => string;
  onSettle: (transaction: Transaction) => void;
}) {
  if (!debt) {
    return (
      <OverviewCard
        aria-label="Acerto entre vocês"
        aria-busy="true"
        className={cardLayout}
      >
        <span
          aria-hidden="true"
          className="w-[44px] h-[44px] rounded-md bg-surface-2"
        />
        <div className="min-w-0 flex flex-col gap-2">
          <h2 className="m-0 font-heading text-lg font-700 leading-tight">
            Acerto entre vocês
          </h2>
          <span className="h-[14px] w-[60%] rounded-sm bg-surface-2 animate-pulse" />
        </div>
      </OverviewCard>
    );
  }

  return <DebtCard debt={debt} {...props} />;
}

function DebtCard({
  debt: { net, unpaid },
  userId,
  partner,
  busy,
  displayMoney,
  onSettle,
}: {
  debt: Debt;
  userId: string;
  partner: Member;
  busy: boolean;
  displayMoney: (value: number) => string;
  onSettle: (transaction: Transaction) => void;
}) {
  // The oldest split the user owes; settling it exposes the next one.
  const owed = unpaid.find((transaction) => transaction.memberId !== userId);

  const Icon = net > 0 ? ArrowDownLeft : net < 0 ? ArrowUpRight : Check;

  return (
    <OverviewCard aria-label="Acerto entre vocês" className={cardLayout}>
      <span
        aria-hidden="true"
        className={cx(
          "w-[44px] h-[44px] rounded-md inline-flex items-center justify-center",
          net < 0 ? "bg-danger-soft text-danger" : "bg-surface-2 text-text",
        )}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <h2
          className={cx(
            "m-0 font-heading text-lg font-700 tabular-nums leading-tight",
            net < 0 && "text-danger",
          )}
        >
          {headline(net, unpaid.length, partner, displayMoney(Math.abs(net)))}
        </h2>
        <p className="m-0 mt-1 text-sm text-text-muted">
          {detail(unpaid.length, unpaid.length > 0 && !owed, partner)}
        </p>
      </div>
      {owed && (
        <Button
          variant="secondary"
          className={cx(
            "min-h-[44px] whitespace-nowrap",
            // Phones put the button under the text so the headline keeps its width.
            "max-bp620:col-span-2 max-bp620:mt-4 max-bp620:w-full",
          )}
          disabled={busy}
          onClick={() => onSettle(owed)}
        >
          Marcar como pago
        </Button>
      )}
      {unpaid.length > 0 && (
        <UnpaidList
          unpaid={unpaid}
          userId={userId}
          partner={partner}
          displayMoney={displayMoney}
        />
      )}
    </OverviewCard>
  );
}

// Collapsed by default so a long month doesn't stretch the overview row.
function UnpaidList({
  unpaid,
  userId,
  partner,
  displayMoney,
}: {
  unpaid: Transaction[];
  userId: string;
  partner: Member;
  displayMoney: (value: number) => string;
}) {
  return (
    <Collapsible.Root className="col-span-full min-w-0 mt-4">
      <Collapsible.Trigger
        className={cx(
          "group w-full min-h-[44px] flex items-center justify-between gap-3",
          "[border-width:1px_0_0] border-solid border-border bg-transparent px-0 pt-3",
          "text-sm font-600 text-text-muted cursor-pointer @hover:text-text",
        )}
      >
        Despesas em aberto
        <ChevronDown
          aria-hidden="true"
          size={18}
          className="shrink-0 motion-safe:transition-transform duration-200 group-data-[panel-open]:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Panel
        className={cx(
          "overflow-hidden h-[var(--collapsible-panel-height)]",
          "motion-safe:transition-[height] duration-200 ease-[var(--ease-out)]",
          "data-[starting-style]:h-0 data-[ending-style]:h-0",
        )}
      >
        <ul className="list-none min-w-0 m-0 p-0 flex flex-col max-h-[216px] overflow-y-auto">
          {unpaid.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-baseline justify-between gap-3 py-3 text-md [border-top:1px_solid_var(--border)] first:[border-top:0] last:pb-0"
            >
              <span
                className="min-w-0 truncate"
                title={transaction.description}
              >
                {transaction.description}
                <span className="text-text-muted text-sm">
                  {" · "}
                  {shortDay(transaction.date)}
                  {" · "}
                  {transaction.memberId === userId
                    ? `${partner.name} deve`
                    : "você deve"}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {displayMoney(partnerShare(transaction.amount))}
              </span>
            </li>
          ))}
        </ul>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

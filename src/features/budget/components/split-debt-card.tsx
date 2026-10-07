import { Button } from "@/components/ui/button";
import { OverviewCard } from "@/features/budget/components/overview-card";
import { shortDay } from "@/features/budget/domain/format";
import { partnerShare } from "@/features/budget/domain/split";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

export function SplitDebtCard({
  net,
  unpaid,
  userId,
  partner,
  busy,
  displayMoney,
  onSettle,
}: {
  net: number;
  unpaid: Transaction[];
  userId: string;
  partner: Member;
  busy: boolean;
  displayMoney: (value: number) => string;
  onSettle: (transaction: Transaction) => void;
}) {
  const headline =
    net > 0
      ? `${partner.name} te deve ${displayMoney(net)}`
      : net < 0
        ? `Você deve ${displayMoney(-net)} a ${partner.name}`
        : unpaid.length
          ? "Vocês estão quites"
          : "Nada pendente entre vocês";

  // The oldest split the user owes; settling it exposes the next one.
  const owed = unpaid.find((transaction) => transaction.memberId !== userId);

  return (
    <OverviewCard
      aria-labelledby="split-debt-title"
      className={cx(
        "grid grid-cols-[minmax(0,1fr)] min-w-0 gap-x-4 content-start",
        "max-bp1000:grid-cols-[minmax(0,1fr)_auto] max-bp1000:items-center",
        "max-bp620:grid-cols-1 max-bp620:px-4 max-bp620:py-4",
      )}
    >
      <h2
        id="split-debt-title"
        className="font-body font-400 uppercase tracking-[0.06em] text-xs text-text-muted m-0 max-bp1000:col-start-1 max-bp1000:normal-case max-bp1000:tracking-normal"
      >
        Acerto entre vocês
      </h2>
      <p
        className={cx(
          "font-heading text-2xl font-700 tabular-nums m-0 mt-4 tracking-[-0.035em]",
          "max-bp1000:col-start-1 max-bp1000:mt-0.5 max-bp1000:text-lg max-bp1000:tracking-normal",
          net < 0 ? "text-danger" : "text-text",
        )}
      >
        {headline}
      </p>
      {unpaid.length ? (
        <ul className="list-none min-w-0 m-0 mt-4 p-0 flex flex-col max-bp1000:hidden">
          {unpaid.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-baseline justify-between gap-3 py-3 text-md [border-top:1px_solid_var(--border)]"
            >
              <span
                className="min-w-0 truncate"
                title={transaction.description}
              >
                {transaction.description}
                <span className="text-text-muted text-sm">
                  {" · "}
                  {shortDay(transaction.date)}
                </span>
              </span>
              <span className="shrink-0">
                {displayMoney(partnerShare(transaction.amount))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-muted m-0 mt-4 max-bp1000:hidden">
          Ao lançar uma despesa, ative “Dividir com {partner.name}” para
          registrar a parte de cada um.
        </p>
      )}
      {owed ? (
        <Button
          variant="secondary"
          className={cx(
            "w-full mt-2 min-h-[44px]",
            "max-bp1000:mt-0 max-bp1000:w-auto max-bp1000:col-start-2 max-bp1000:row-start-1 max-bp1000:row-span-2 max-bp1000:whitespace-nowrap",
            // Phones stack the button under the text so the headline keeps its width.
            "max-bp620:mt-3 max-bp620:w-full max-bp620:col-start-1 max-bp620:row-start-auto max-bp620:row-span-1",
          )}
          disabled={busy}
          onClick={() => onSettle(owed)}
        >
          Marcar como pago
        </Button>
      ) : (
        unpaid.length > 0 && (
          <p className="text-xs text-text-muted m-0 mt-1.5 max-bp1000:col-start-1">
            Aguardando {partner.name}
          </p>
        )
      )}
    </OverviewCard>
  );
}

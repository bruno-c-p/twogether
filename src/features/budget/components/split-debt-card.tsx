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
        "grid gap-x-[16px] content-start",
        "max-bp1000:grid-cols-[1fr_auto] max-bp1000:items-center",
        "max-bp620:px-[16px] max-bp620:py-[14px]",
      )}
    >
      <h2
        id="split-debt-title"
        className="font-body font-400 uppercase tracking-[1px] text-[12px] text-text-muted m-0 max-bp1000:normal-case max-bp1000:tracking-normal max-bp1000:text-[12px]"
      >
        Acerto entre vocês
      </h2>
      <p
        className={cx(
          "font-heading text-[28px] font-600 tabular-nums m-0 mt-[14px] tracking-[-0.5px]",
          "max-bp1000:mt-[2px] max-bp1000:text-[17px] max-bp1000:tracking-normal",
          net < 0 ? "text-danger" : "text-text",
        )}
      >
        {headline}
      </p>
      {unpaid.length ? (
        <ul className="list-none m-0 mt-[18px] p-0 flex flex-col max-bp1000:hidden">
          {unpaid.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-baseline justify-between gap-[12px] py-[12px] text-[14px] [border-top:1px_solid_var(--border)]"
            >
              <span className="min-w-0 truncate">
                {transaction.description}
                <span className="text-text-muted text-[13px]">
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
        <p className="text-[12px] text-text-muted m-0 mt-[14px] max-bp1000:hidden">
          Ao lançar uma despesa, ative “Dividir com {partner.name}” para
          registrar a parte de cada um.
        </p>
      )}
      {owed ? (
        <Button
          variant="secondary"
          className={cx(
            "w-full mt-[10px] min-h-[44px]",
            "max-bp1000:mt-0 max-bp1000:w-auto max-bp1000:col-start-2 max-bp1000:row-start-1 max-bp1000:row-span-2 max-bp1000:whitespace-nowrap",
          )}
          disabled={busy}
          onClick={() => onSettle(owed)}
        >
          Marcar como pago
        </Button>
      ) : (
        unpaid.length > 0 && (
          <p className="text-[12px] text-text-muted m-0 mt-[6px] max-bp1000:col-start-1">
            Aguardando {partner.name}
          </p>
        )
      )}
    </OverviewCard>
  );
}

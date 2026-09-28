import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import { partnerShare } from "@/features/budget/domain/split";
import type { Member, Transaction } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

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

  return (
    <Panel aria-labelledby="split-debt-title">
      <SectionHeading
        title="Despesas divididas"
        titleId="split-debt-title"
        count={unpaid.length}
        description="Metade de cada despesa dividida fica com cada pessoa."
      />
      <div className="px-[23px] pb-[12px] max-bp620:px-[17px]">
        <p
          className={cx(
            "font-heading text-[20px] font-600 mb-[14px]",
            "max-bp620:text-[17px]",
            net < 0 ? "text-danger" : "text-text",
          )}
        >
          {headline}
        </p>
        {unpaid.length ? (
          <ul className="list-none m-0 p-0 flex flex-col">
            {unpaid.map((transaction) => {
              const debtorIsUser = transaction.memberId !== userId;

              return (
                <li
                  key={transaction.id}
                  className={cx(
                    "flex items-center gap-[12px] py-[11px] flex-wrap",
                    "[border-top:1px_solid_var(--border)]",
                  )}
                >
                  <span className="w-[30px] h-[30px] rounded-[8px] bg-surface-soft grid place-items-center text-text-muted shrink-0">
                    <Users size={15} />
                  </span>
                  <span className="flex-1 min-w-[140px]">
                    <span className="block text-[12px] font-500 text-text truncate bp1450:text-[13px]">
                      {transaction.description}
                    </span>
                    <span className="block text-[11px] text-text-muted mt-[3px]">
                      {dayFormatter
                        .format(new Date(`${transaction.date}T12:00:00`))
                        .replaceAll(" de ", " ")
                        .replace(".", "")}
                      {" · "}
                      {debtorIsUser
                        ? `Você deve ${displayMoney(partnerShare(transaction.amount))}`
                        : `${partner.name} deve ${displayMoney(partnerShare(transaction.amount))}`}
                    </span>
                  </span>
                  {debtorIsUser ? (
                    <Button
                      variant="secondary"
                      className="max-bp620:w-full"
                      disabled={busy}
                      onClick={() => onSettle(transaction)}
                    >
                      Marcar como pago
                    </Button>
                  ) : (
                    <span className="text-[11px] text-text-muted">
                      Aguardando {partner.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px] text-text-muted m-0 pb-[11px]">
            Ao lançar uma despesa, ative “Dividir com {partner.name}” para
            registrar a parte de cada um.
          </p>
        )}
      </div>
    </Panel>
  );
}

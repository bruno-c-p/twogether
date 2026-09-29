import { currentMonth } from "@/features/budget/domain/format";
import { OverviewCard } from "@/features/budget/components/overview-card";
import type { summarize } from "@/features/budget/domain/calc";
import { cx } from "@/lib/cx";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function monthName(month: string) {
  return monthFormatter.format(new Date(`${month}-15T12:00:00`));
}

function daysLeft(month: string, today = new Date()) {
  if (month !== currentMonth(today)) return null;

  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(year, number, 0).getDate();

  return lastDay - today.getDate();
}

function closingLabel(days: number) {
  if (days === 0) return "Último dia do mês";

  return days === 1
    ? "Falta 1 dia para fechar o mês"
    : `Faltam ${days} dias para fechar o mês`;
}

export function BalanceCard({
  summary,
  month,
  memberFilter,
  displayMoney,
  className,
}: {
  summary: ReturnType<typeof summarize>;
  month: string;
  memberFilter: string;
  displayMoney: (value: number) => string;
  className?: string;
}) {
  const days = daysLeft(month);

  return (
    <OverviewCard
      aria-label="Resumo mensal"
      tone="balance"
      className={cx(
        "flex flex-col gap-[28px] max-bp1000:gap-[14px] max-bp620:p-[20px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-[12px] flex-wrap">
        <div className="min-w-0">
          <p className="m-0 text-[14px] text-on-balance-muted max-bp620:text-[13px]">
            {memberFilter === "all" ? "Sobra de" : "Sobra desta pessoa em"}{" "}
            {monthName(month)}
          </p>
          <p
            className={cx(
              "m-0 mt-[10px] font-heading font-600 tracking-[-1.5px] leading-none",
              "text-[52px] max-bp620:text-[36px] max-bp620:mt-[8px]",
              "break-words",
            )}
          >
            {displayMoney(summary.balance)}
          </p>
        </div>
        {days !== null && (
          <span className="rounded-full px-[14px] py-[6px] text-[12px] bg-[color-mix(in_srgb,var(--on-balance)_10%,transparent)] text-on-balance-muted max-bp1000:hidden">
            {closingLabel(days)}
          </span>
        )}
      </div>
      <dl
        className={cx(
          "m-0 flex gap-[40px] pt-[24px] max-bp1000:pt-0 max-bp620:gap-[20px] flex-wrap",
          "[border-top:1px_solid_color-mix(in_srgb,var(--on-balance)_14%,transparent)]",
          "max-bp1000:[border-top:0]",
        )}
      >
        <BalanceFigure label="Entradas" value={displayMoney(summary.income)} />
        <BalanceFigure label="Saídas" value={displayMoney(summary.expenses)} />
      </dl>
    </OverviewCard>
  );
}

function BalanceFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[6px] max-bp1000:flex-row max-bp1000:items-baseline max-bp1000:gap-[6px]">
      <dt className="text-[13px] text-on-balance-muted max-bp620:text-[12px]">
        {label}
      </dt>
      <dd className="m-0 text-[20px] font-500 max-bp620:text-[13px] max-bp1000:text-[15px]">
        {value}
      </dd>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useHydrated } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { currentMonth, monthName } from "@/features/budget/domain/format";
import { OverviewCard } from "@/features/budget/components/overview-card";
import type { summarize } from "@/features/budget/domain/calc";
import { cx } from "@/lib/cx";
import { percentOf } from "@/lib/decimal";

function daysLeft(month: string, today: Date) {
  if (month !== currentMonth(today)) return null;

  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(year, number, 0).getDate();

  return lastDay - today.getDate();
}

function closingLabel(days: number) {
  if (days === 0) return "Último dia do mês";

  return days === 1 ? "Falta 1 dia" : `Faltam ${days} dias`;
}

// Share of the month's income already spent; spending with no income fills it.
function spentWidth(income: number, expenses: number, hidden: boolean) {
  if (hidden || expenses <= 0) return "0%";

  if (income <= 0) return "100%";

  return `${Math.min(100, percentOf(expenses, income))}%`;
}

export function BalanceCard({
  summary,
  month,
  memberFilter,
  displayMoney,
  hidden,
  onToggleHidden,
  className,
}: {
  summary: ReturnType<typeof summarize>;
  month: string;
  memberFilter: string;
  displayMoney: (value: number) => string;
  hidden: boolean;
  onToggleHidden: () => void;
  className?: string;
}) {
  // The server's clock and time zone can differ from the reader's, so the
  // countdown waits for hydration instead of risking a mismatch.
  const hydrated = useHydrated();
  const days = hydrated ? daysLeft(month, new Date()) : null;
  const overspent = summary.expenses > summary.income;

  return (
    <OverviewCard
      aria-label="Resumo mensal"
      tone="balance"
      className={cx(
        "flex flex-col justify-between gap-8 max-bp1000:gap-6 max-bp620:p-5",
        className,
      )}
    >
      <div className="min-w-0 [container-type:inline-size]">
        <div className="flex items-start justify-between gap-3">
          <p className="m-0 text-md font-500 text-on-balance max-bp620:text-sm">
            {memberFilter === "all" ? "Sobra de" : "Sobra desta pessoa em"}{" "}
            {monthName(month)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {days !== null && (
              <span className="rounded-full px-4 py-1.5 text-xs bg-[color-mix(in_srgb,var(--on-balance)_10%,transparent)] text-on-balance-muted max-bp1000:hidden">
                {closingLabel(days)}
              </span>
            )}
            <Button
              variant="unstyled"
              type="button"
              onClick={onToggleHidden}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
              className={cx(
                "w-[32px] h-[32px] inline-flex items-center justify-center shrink-0 relative",
                "after:content-[''] after:absolute after:[inset:min(0px,(100%_-_44px)/2)]",
                "border-0 bg-transparent p-0 rounded-sm text-on-balance-muted",
                "@hover:bg-[color-mix(in_srgb,var(--on-balance)_10%,transparent)]",
              )}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </Button>
          </div>
        </div>
        <p
          className="m-0 mt-2 font-heading font-800 tracking-[-0.045em] leading-none whitespace-nowrap tabular-nums [--balance-size:76px] max-bp1000:[--balance-size:56px] max-bp620:[--balance-size:40px]"
          style={{
            fontSize: `min(var(--balance-size), ${160 / displayMoney(summary.balance).length}cqi)`,
          }}
        >
          {displayMoney(summary.balance)}
        </p>
      </div>
      <div>
        <div
          aria-hidden="true"
          className="h-[8px] rounded-full overflow-clip bg-[color-mix(in_srgb,var(--on-balance)_12%,transparent)]"
        >
          <div
            className={cx(
              "h-full rounded-full",
              overspent ? "bg-danger" : "bg-on-balance",
            )}
            style={{
              width: spentWidth(summary.income, summary.expenses, hidden),
            }}
          />
        </div>
        <p className="m-0 mt-3 text-sm text-on-balance-muted max-bp620:text-xs">
          <strong className="font-700 text-on-balance tabular-nums">
            {displayMoney(summary.expenses)}
          </strong>{" "}
          gastos dos{" "}
          <strong className="font-700 text-on-balance tabular-nums">
            {displayMoney(summary.income)}
          </strong>{" "}
          que entraram
        </p>
      </div>
    </OverviewCard>
  );
}

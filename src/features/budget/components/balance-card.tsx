import { useHydrated } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { currentMonth, monthName } from "@/features/budget/domain/format";
import { OverviewCard } from "@/features/budget/components/overview-card";
import type { summarize } from "@/features/budget/domain/calc";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { cx } from "@/lib/cx";

function daysLeft(month: string, today: Date) {
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
  hidden,
  onToggleHidden,
  partners,
  className,
}: {
  summary: ReturnType<typeof summarize>;
  month: string;
  memberFilter: string;
  displayMoney: (value: number) => string;
  hidden: boolean;
  onToggleHidden: () => void;
  partners?: Partner[];
  className?: string;
}) {
  // The server's clock and time zone can differ from the reader's, so the
  // countdown waits for hydration instead of risking a mismatch.
  const hydrated = useHydrated();
  const days = hydrated ? daysLeft(month, new Date()) : null;

  return (
    <OverviewCard
      aria-label="Resumo mensal"
      tone="balance"
      className={cx(
        "flex flex-col gap-8 max-bp1000:gap-4 max-bp620:p-5",
        className,
      )}
    >
      <div className="min-w-0 [container-type:inline-size]">
        <div className="flex items-start justify-between gap-3">
          <p className="m-0 text-md text-on-balance-muted max-bp620:text-sm">
            {memberFilter === "all" ? "Sobra de" : "Sobra desta pessoa em"}{" "}
            {monthName(month)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {days !== null && (
              <span className="rounded-full px-4 py-1.5 text-xs bg-[color-mix(in_srgb,var(--on-balance)_10%,transparent)] text-on-balance-muted max-bp1000:hidden">
                {closingLabel(days)}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleHidden}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
              className={cx(
                "w-[32px] h-[32px] inline-flex items-center justify-center shrink-0",
                "border-0 bg-transparent p-0 rounded-sm text-on-balance-muted",
                "@hover:bg-[color-mix(in_srgb,var(--on-balance)_10%,transparent)]",
              )}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>
        <p
          className="m-0 mt-2 font-heading font-800 tracking-[-0.045em] leading-none whitespace-nowrap tabular-nums [--balance-size:52px] max-bp620:[--balance-size:30px]"
          style={{
            fontSize: `min(var(--balance-size), ${160 / displayMoney(summary.balance).length}cqi)`,
          }}
        >
          {displayMoney(summary.balance)}
        </p>
      </div>
      <dl
        className={cx(
          "m-0 flex gap-10 pt-6 max-bp1000:pt-0 max-bp620:gap-5 flex-wrap",
          "[border-top:1px_solid_color-mix(in_srgb,var(--on-balance)_14%,transparent)]",
          "max-bp1000:[border-top:0]",
        )}
      >
        <BalanceFigure
          label="Entradas"
          value={displayMoney(summary.income)}
          parts={partners?.map((partner) => ({
            ...partner,
            value: displayMoney(partner.income),
          }))}
        />
        <BalanceFigure
          label="Saídas"
          value={displayMoney(summary.expenses)}
          parts={partners?.map((partner) => ({
            ...partner,
            value: displayMoney(partner.expenses),
          }))}
        />
      </dl>
    </OverviewCard>
  );
}

type Partner = {
  memberId: string;
  name: string;
  position: number;
  income: number;
  expenses: number;
};

function BalanceFigure({
  label,
  value,
  parts,
}: {
  label: string;
  value: string;
  parts?: (Partner & { value: string })[];
}) {
  return (
    <div className="flex flex-col gap-1.5 max-bp1000:flex-row max-bp1000:flex-wrap max-bp1000:items-baseline">
      <dt className="text-sm text-on-balance-muted max-bp620:text-xs">
        {label}
      </dt>
      <dd className="m-0 text-xl font-500 tabular-nums max-bp620:text-sm max-bp1000:text-md">
        {value}
      </dd>
      {parts && (
        <dd className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-600 tabular-nums text-on-balance-muted max-bp1000:basis-full">
          {parts.map((part) => (
            <span
              key={part.memberId}
              className="inline-flex items-center gap-1.5"
            >
              <PersonAvatar
                aria-hidden="true"
                name={part.name}
                position={part.position}
                className="w-[20px] h-[20px] text-xs"
              />
              <span className="sr-only">{part.name}: </span>
              {part.value}
            </span>
          ))}
        </dd>
      )}
    </div>
  );
}

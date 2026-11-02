import { useHydrated } from "@tanstack/react-router";
import { Hide, Icon, Show } from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import { Progress, ProgressValue } from "@/components/glaze/ui/progress";
import { monthName } from "@/features/budget/domain/format";
import type { summarize } from "@/features/budget/domain/calc";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";
import { percentOf } from "@/lib/decimal";

// `date` is the reader's "YYYY-MM-DD".
function daysLeft(month: string, date: string) {
  if (date.slice(0, 7) !== month) return null;

  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(year, number, 0).getDate();

  return lastDay - Number(date.slice(8));
}

function closingLabel(days: number) {
  if (days === 0) return "Último dia do mês";

  return days === 1 ? "Falta 1 dia" : `Faltam ${days} dias`;
}

// Share of the month's income already spent; spending with no income fills it.
function spentShare(income: number, expenses: number, hidden: boolean) {
  if (hidden || expenses <= 0) return 0;

  if (income <= 0) return 100;

  return Math.min(100, percentOf(expenses, income));
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
  const days = hydrated ? daysLeft(month, today(browserTimeZone())) : null;
  const overspent = summary.expenses > summary.income;
  const toggleLabel = hidden ? "Mostrar valores" : "Ocultar valores";

  return (
    <Card role="region" aria-label="Resumo mensal" className={className}>
      <CardHeader>
        <CardTitle>
          {memberFilter === "all" ? "Sobra de" : "Sobra desta pessoa em"}{" "}
          {monthName(month)}
        </CardTitle>
        {days !== null && (
          <CardDescription>{closingLabel(days)}</CardDescription>
        )}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleHidden}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            <Icon icon={hidden ? Hide : Show} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 justify-between gap-6">
        <p className="type-title tabular-nums">
          {displayMoney(summary.balance)}
        </p>
        <div className="flex flex-col gap-2">
          <Progress
            mode="meter"
            size="sm"
            aria-label="Gastos sobre entradas"
            value={spentShare(summary.income, summary.expenses, hidden)}
            warnAt={null}
            failAt={null}
            status={overspent && !hidden ? "fail" : undefined}
            statusLabel="Acima das entradas"
          >
            {/* Only the status words when overspent; the sentence below carries the amounts. */}
            {overspent && !hidden && (
              <ProgressValue>{() => null}</ProgressValue>
            )}
          </Progress>
          <p className="type-body-sm text-text-2">
            <strong className="font-medium text-text-1 tabular-nums">
              {displayMoney(summary.expenses)}
            </strong>{" "}
            gastos dos{" "}
            <strong className="font-medium text-text-1 tabular-nums">
              {displayMoney(summary.income)}
            </strong>{" "}
            que entraram
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

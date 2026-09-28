import { useEffect, useRef, useState } from "react";
import { money } from "@/features/budget/domain/format";
import { summarizeHistory } from "@/features/budget/services/financial-history";
import type { Transaction } from "@/features/budget/domain/types";
import charts from "@/features/budget/components/expense-charts/expense-charts.module.css";
import styles from "@/features/budget/components/financial-history/financial-history.module.css";

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function FinancialHistory({
  transactions,
  month,
  hidden,
}: {
  transactions: Transaction[];
  month: string;
  hidden: boolean;
}) {
  const [period, setPeriod] = useState(6);
  const scrollRef = useRef<HTMLDivElement>(null);
  const months = summarizeHistory(transactions, month, period);

  const max = Math.max(
    ...months.flatMap((item) => [item.income, item.expense]),
    0,
  );

  useEffect(() => {
    const element = scrollRef.current;

    if (element) element.scrollLeft = element.scrollWidth;
  }, [period, month, hidden, max]);
  const ceiling = max ? Math.ceil(max / 400) * 400 : 400;

  return (
    <section
      className={`${charts.expenseChartCard} ${styles.financialHistory}`}
      aria-labelledby="history-title"
    >
      <header className={styles.historyHeading}>
        <div>
          <h2 id="history-title">Histórico financeiro</h2>
          <p className={charts.expenseChartCaption}>
            Comparativo mensal de salários e despesas · até{" "}
            {months.at(-1)?.label}
          </p>
        </div>
        <div
          className={styles.historyPeriods}
          role="group"
          aria-label="Período do histórico"
        >
          {([3, 6, 12] as const).map((count) => (
            <button
              key={count}
              type="button"
              aria-label={count === 12 ? "1 ano" : `${count} meses`}
              aria-pressed={period === count}
              onClick={() => setPeriod(count)}
            >
              {count === 12 ? "1A" : `${count}M`}
            </button>
          ))}
        </div>
      </header>
      {hidden ? (
        <p className={styles.historyMessage}>Valores ocultos</p>
      ) : max === 0 ? (
        <p className={styles.historyMessage}>
          Nenhuma entrada ou saída neste período.
        </p>
      ) : (
        <div className={styles.historyPlot}>
          <div className={styles.historyAxis} aria-hidden="true">
            {[4, 3, 2, 1, 0].map((step) => (
              <span key={step}>
                R$ {compact.format((ceiling * step) / 400)}
              </span>
            ))}
          </div>
          <div
            ref={scrollRef}
            className={styles.historyScroll}
            tabIndex={0}
            role="region"
            aria-label="Comparativo por mês. Role horizontalmente para ver todos os meses."
          >
            <div
              className={styles.historyMonths}
              style={{ minWidth: period * 68 }}
            >
              {months.map((item) => (
                <div className={styles.historyMonth} key={item.month}>
                  <div
                    className={styles.historyBars}
                    tabIndex={0}
                    aria-label={`${item.label}: salários ${money(item.income)}, despesas ${money(item.expense)}`}
                  >
                    <span
                      className={styles.historyIncome}
                      style={{ height: `${(item.income / ceiling) * 100}%` }}
                    />
                    <span
                      className={styles.historyExpense}
                      style={{ height: `${(item.expense / ceiling) * 100}%` }}
                    />
                    <div className={styles.historyTooltip} role="tooltip">
                      <strong>{item.label}</strong>
                      <span>Salários: {money(item.income)}</span>
                      <span>Despesas: {money(item.expense)}</span>
                    </div>
                  </div>
                  <span className={styles.historyMonthLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={styles.historyLegend}>
        <span>
          <i className={styles.historyIncome} />
          Entradas (salário)
        </span>
        <span>
          <i className={styles.historyExpense} />
          Saídas
        </span>
      </div>
    </section>
  );
}

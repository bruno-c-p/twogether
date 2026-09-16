import { useEffect, useRef, useState } from "react";
import { money } from "../services/budget";
import { summarizeHistory } from "../services/financial-history";
import type { Transaction } from "../types";

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
      className="expense-chart-card financial-history"
      aria-labelledby="history-title"
    >
      <header className="history-heading">
        <div>
          <h2 id="history-title">Histórico financeiro</h2>
          <p className="expense-chart-caption">
            Comparativo mensal de salários e despesas · até{" "}
            {months.at(-1)?.label}
          </p>
        </div>
        <div
          className="history-periods"
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
        <p className="history-message">Valores ocultos</p>
      ) : max === 0 ? (
        <p className="history-message">
          Nenhuma entrada ou saída neste período.
        </p>
      ) : (
        <div className="history-plot">
          <div className="history-axis" aria-hidden="true">
            {[4, 3, 2, 1, 0].map((step) => (
              <span key={step}>
                R$ {compact.format((ceiling * step) / 400)}
              </span>
            ))}
          </div>
          <div
            ref={scrollRef}
            className="history-scroll"
            tabIndex={0}
            role="region"
            aria-label="Comparativo por mês. Role horizontalmente para ver todos os meses."
          >
            <div className="history-months" style={{ minWidth: period * 68 }}>
              {months.map((item) => (
                <div className="history-month" key={item.month}>
                  <div
                    className="history-bars"
                    tabIndex={0}
                    aria-label={`${item.label}: salários ${money(item.income)}, despesas ${money(item.expense)}`}
                  >
                    <span
                      className="history-income"
                      style={{ height: `${(item.income / ceiling) * 100}%` }}
                    />
                    <span
                      className="history-expense"
                      style={{ height: `${(item.expense / ceiling) * 100}%` }}
                    />
                    <div className="history-tooltip" role="tooltip">
                      <strong>{item.label}</strong>
                      <span>Salários: {money(item.income)}</span>
                      <span>Despesas: {money(item.expense)}</span>
                    </div>
                  </div>
                  <span className="history-month-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="history-legend">
        <span>
          <i className="history-income" />
          Entradas (salário)
        </span>
        <span>
          <i className="history-expense" />
          Saídas
        </span>
      </div>
    </section>
  );
}

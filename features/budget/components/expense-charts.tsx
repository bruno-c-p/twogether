import type { CSSProperties } from "react";
import { GOALS } from "../constants";
import { money } from "../services/budget";
import { summarizeExpenses } from "../services/expense-charts";
import type { Transaction } from "../types";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const compactMoney = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function ExpenseCharts({
  transactions,
  month,
  hidden,
}: {
  transactions: Transaction[];
  month: string;
  hidden: boolean;
}) {
  const { days, total, firstWeekday, tags } = summarizeExpenses(
    transactions,
    month,
  );
  const max = Math.max(...days, 1);
  const activeDays = days.filter((amount) => amount > 0).length;
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" },
  );
  const display = (amount: number) => (hidden ? "R$ ••••" : money(amount));
  let offset = 0;
  const segments = tags.map((tag, index) => {
    const share = total ? (tag.amount / total) * 100 : 0;
    const start = offset;
    offset += share;
    return {
      ...tag,
      share,
      start,
      color:
        tag.name === null ? "var(--muted)" : GOALS[index % GOALS.length].color,
    };
  });
  return (
    <section
      className="overview-grid expense-charts"
      aria-label="Gráficos de despesas do mês"
    >
      <article className="expense-chart-card">
        <h2>Saídas por dia</h2>
        <p className="expense-chart-caption">
          {monthLabel} · quanto saiu em cada dia (R$)
        </p>
        <div className="expense-calendar-summary">
          <strong>{display(total)}</strong>
          <span>
            {hidden
              ? "Valores ocultos"
              : `em ${activeDays} ${activeDays === 1 ? "dia com saída" : "dias com saída"}`}
          </span>
        </div>
        <div className="expense-calendar">
          {weekdays.map((day) => (
            <span className="expense-weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: firstWeekday }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {days.map((amount, index) => (
            <div
              key={index}
              className="expense-day"
              data-intense={!hidden && amount / max > 0.6}
              style={
                {
                  "--day-strength":
                    hidden || !amount ? "0%" : `${15 + (amount / max) * 55}%`,
                } as CSSProperties
              }
              title={`${index + 1} de ${monthLabel}: ${display(amount)}`}
            >
              <span>{index + 1}</span>
              <strong>
                {hidden
                  ? "••"
                  : amount
                    ? compactMoney.format(amount / 100).replace(/\s/g, "")
                    : "–"}
              </strong>
            </div>
          ))}
        </div>
        <div className="expense-heat-legend">
          <span>
            {!hidden && total === 0 ? "Nenhuma despesa neste mês" : "Menos"}
          </span>
          <i />
          <i />
          <i />
          <span>Mais</span>
        </div>
      </article>
      <article className="expense-chart-card">
        <h2>Despesas por tag</h2>
        <p className="expense-chart-caption">
          Como os gastos se dividem no mês
        </p>
        <div className="expense-tag-donut">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={
              hidden
                ? "Despesas por tag ocultas"
                : `Despesas por tag: ${money(total)}. Detalhes na lista abaixo.`
            }
          >
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="var(--border)"
              strokeWidth="28"
            />
            {!hidden &&
              segments
                .filter((tag) => tag.share > 0)
                .map((tag) => (
                  <circle
                    key={JSON.stringify(tag.name)}
                    cx="100"
                    cy="100"
                    r="78"
                    fill="none"
                    stroke={tag.color}
                    strokeWidth="28"
                    pathLength="100"
                    strokeDasharray={`${tag.share} ${100 - tag.share}`}
                    strokeDashoffset={-tag.start}
                    transform="rotate(-90 100 100)"
                  />
                ))}
          </svg>
          <div>
            <strong>{display(total)}</strong>
            <span>total no mês</span>
          </div>
        </div>
        {segments.length ? (
          <ul className="expense-tag-list">
            {segments.map((tag) => (
              <li key={JSON.stringify(tag.name)}>
                <span className="color-dot" style={{ background: tag.color }} />
                <span className="expense-tag-name">
                  {tag.name ?? "Sem tags"}
                </span>
                <span className="expense-tag-track" aria-hidden="true">
                  <i
                    style={{
                      width: hidden ? "0%" : `${tag.share}%`,
                      background: tag.color,
                    }}
                  />
                </span>
                <strong>{display(tag.amount)}</strong>
                <span>
                  {hidden
                    ? "••"
                    : `${tag.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="expense-chart-empty">
            Adicione uma despesa para ver a distribuição por tag.
          </p>
        )}
        {transactions.some(
          (t) => t.kind === "expense" && t.tags.length > 1,
        ) && (
          <p className="expense-chart-caption expense-tag-note">
            Despesas com várias tags têm o valor dividido entre elas.
          </p>
        )}
      </article>
    </section>
  );
}

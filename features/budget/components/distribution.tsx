import { GOALS } from "@/features/budget/constants";
import { money, summarize } from "@/features/budget/services/budget";
import type { Transaction } from "@/features/budget/types";
import ui from "@/src/ui.module.css";
import styles from "@/features/budget/components/distribution.module.css";

export function Distribution({
  transactions,
  hidden,
}: {
  transactions: Transaction[];
  hidden: boolean;
}) {
  const { goals, expenses } = summarize(transactions);
  let offset = 0;
  return (
    <div className={styles.distribution}>
      <div className={styles.distributionHeading}>
        <span className={ui.eyebrow}>DESPESAS DO MÊS</span>
        <h3>Distribuição por meta</h3>
      </div>
      <div className={styles.distributionBody}>
        <div className={styles.donut}>
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label={
              hidden
                ? "Distribuição de despesas oculta"
                : `Distribuição de ${money(expenses)} entre as seis metas`
            }
          >
            <circle
              cx="80"
              cy="80"
              r="63"
              fill="none"
              stroke="var(--border)"
              strokeWidth="19"
            />
            {!hidden &&
              goals.map((goal) => {
                const share = expenses ? (goal.amount / expenses) * 100 : 0;
                const start = offset;
                offset += share;
                return (
                  share > 0 && (
                    <circle
                      key={goal.id}
                      cx="80"
                      cy="80"
                      r="63"
                      fill="none"
                      stroke={goal.color}
                      strokeWidth="19"
                      pathLength="100"
                      strokeDasharray={`${Math.max(0, share - 1.9)} ${100 - Math.max(0, share - 1.9)}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 80 80)"
                    />
                  )
                );
              })}
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutFlower}>✳</span>
            <span>Total gasto</span>
          </div>
        </div>
        <div className={styles.chartLegend}>
          {GOALS.map((goal) => (
            <div key={goal.id}>
              <span className={ui.colorDot} style={{ background: goal.color }} />
              <span>{goal.name}</span>
              <strong>
                {hidden
                  ? "••"
                  : `${expenses ? Math.round(((goals.find((g) => g.id === goal.id)?.amount ?? 0) / expenses) * 100) : 0}%`}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { donutSegments } from "@/features/budget/services/donut";
import type { Transaction } from "@/features/budget/domain/types";
import { ColorDot } from "@/components/ui/color-dot/color-dot";
import styles from "@/features/budget/components/distribution.module.css";

export function Distribution({
  transactions,
  hidden,
}: {
  transactions: Transaction[];
  hidden: boolean;
}) {
  const { goals, expenses } = summarize(transactions);
  const segments = donutSegments(goals, (goal) => goal.amount);
  return (
    <div className={styles.distribution}>
      <div className={styles.distributionHeading}>
        <span className={styles.eyebrow}>DESPESAS DO MÊS</span>
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
              segments.map(
                ({ item: goal, share, start }) =>
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
                  ),
              )}
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutFlower}>✳</span>
            <span>Total gasto</span>
          </div>
        </div>
        <div className={styles.chartLegend}>
          {goals.map((goal) => (
            <div key={goal.id}>
              <ColorDot style={{ background: goal.color }} />
              <span>{goal.name}</span>
              <strong>
                {hidden
                  ? "••"
                  : `${expenses ? Math.round((goal.amount / expenses) * 100) : 0}%`}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

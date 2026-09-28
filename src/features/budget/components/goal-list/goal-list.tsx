import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import type { GoalId } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/goal-list/goal-list.module.css";

export function GoalList({
  summary,
  plans,
  expanded,
  hidden,
  displayMoney,
  onFilterGoal,
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  expanded: boolean;
  hidden: boolean;
  displayMoney: (value: number) => string;
  onFilterGoal: (id: GoalId) => void;
}) {
  return (
    <div
      className={`${styles.goalsGrid} ${expanded ? styles.expandedGoals : ""}`}
    >
      {summary.goals.map((goal) => {
        const plan = plans.find((item) => item.id === goal.id) ?? {
          planned: 0,
          percentage: null,
        };

        const overBudget = goal.amount > plan.planned;
        const overage = goal.amount - plan.planned;

        return (
          <button
            key={goal.id}
            className={`${styles.goalCard} ${overBudget ? styles.overBudget : ""}`}
            aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
            style={{
              "--goal-color": goal.color,
              "--goal-bg": goal.background,
            }}
            onClick={() => onFilterGoal(goal.id)}
          >
            <div className={styles.goalCardTop}>
              <span className={styles.goalIcon}>
                <GoalIcon goal={goal.id} size={21} />
              </span>
              <span className={styles.goalNumber}>
                {plan.percentage === null
                  ? "—"
                  : `${plan.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
              </span>
            </div>
            <h3>{goal.name}</h3>
            <strong>{displayMoney(goal.amount)}</strong>
            <p className={styles.goalBudget}>
              de {displayMoney(plan.planned)} planejados
            </p>
            <div className={styles.goalCardFoot}>
              <span>
                {goal.count} {goal.count === 1 ? "transação" : "transações"}
              </span>
              {overBudget ? (
                <span
                  className={styles.goalStatus}
                  title={
                    hidden
                      ? "Acima do planejado"
                      : `${displayMoney(overage)} acima do planejado`
                  }
                >
                  <TriangleAlert size={14} />
                  <span>
                    {hidden
                      ? "Acima do planejado"
                      : `${displayMoney(overage)} acima`}
                  </span>
                </span>
              ) : (
                <ArrowUpRight size={16} />
              )}
            </div>
            <div className={styles.goalBar}>
              <span
                style={{
                  width: hidden
                    ? "0%"
                    : `${plan.planned > 0 ? Math.min(100, (goal.amount / plan.planned) * 100) : goal.amount > 0 ? 100 : 0}%`,
                }}
              />
            </div>
            {expanded && (
              <p className={styles.goalDescription}>{goal.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

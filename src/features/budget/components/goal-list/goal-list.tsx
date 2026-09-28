import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import type { GoalId } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/goal-list/goal-list.module.css";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type GoalPlan = { planned: number; percentage: number | null };

const OVER_BUDGET_LABEL = "Acima do planejado";

function percentageLabel(percentage: number | null) {
  if (percentage === null) return "—";

  return `${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function progressWidth(amount: number, planned: number, hidden: boolean) {
  if (hidden) return "0%";

  if (planned > 0) return `${Math.min(100, (amount / planned) * 100)}%`;

  return amount > 0 ? "100%" : "0%";
}

function GoalStatus({
  overage,
  hidden,
  displayMoney,
}: {
  overage: number;
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const amount = displayMoney(overage);

  return (
    <span
      className={styles.goalStatus}
      title={hidden ? OVER_BUDGET_LABEL : `${amount} acima do planejado`}
    >
      <TriangleAlert size={14} />
      <span>{hidden ? OVER_BUDGET_LABEL : `${amount} acima`}</span>
    </span>
  );
}

function GoalCard({
  goal,
  plan,
  expanded,
  hidden,
  displayMoney,
  onFilterGoal,
}: {
  goal: GoalSummary;
  plan: GoalPlan;
  expanded: boolean;
  hidden: boolean;
  displayMoney: (value: number) => string;
  onFilterGoal: (id: GoalId) => void;
}) {
  const overBudget = goal.amount > plan.planned;
  const planned = `${displayMoney(plan.planned)} planejados`;
  const overBudgetSuffix = overBudget ? ", acima do planejado" : "";

  return (
    <button
      className={`${styles.goalCard} ${overBudget ? styles.overBudget : ""}`}
      aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${planned}${overBudgetSuffix}`}
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
          {percentageLabel(plan.percentage)}
        </span>
      </div>
      <h3>{goal.name}</h3>
      <strong>{displayMoney(goal.amount)}</strong>
      <p className={styles.goalBudget}>de {planned}</p>
      <div className={styles.goalCardFoot}>
        <span>
          {goal.count} {goal.count === 1 ? "transação" : "transações"}
        </span>
        {overBudget ? (
          <GoalStatus
            overage={goal.amount - plan.planned}
            hidden={hidden}
            displayMoney={displayMoney}
          />
        ) : (
          <ArrowUpRight size={16} />
        )}
      </div>
      <div className={styles.goalBar}>
        <span
          style={{ width: progressWidth(goal.amount, plan.planned, hidden) }}
        />
      </div>
      {expanded && <p className={styles.goalDescription}>{goal.description}</p>}
    </button>
  );
}

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
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <div
      className={`${styles.goalsGrid} ${expanded ? styles.expandedGoals : ""}`}
    >
      {summary.goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          plan={plansById.get(goal.id) ?? { planned: 0, percentage: null }}
          expanded={expanded}
          hidden={hidden}
          displayMoney={displayMoney}
          onFilterGoal={onFilterGoal}
        />
      ))}
    </div>
  );
}

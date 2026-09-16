import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { money, planGoals, summarize } from "../services/budget";
import type { GoalId } from "../types";
import { GoalIcon } from "./goal-icon";

interface Props {
  expanded: boolean;
  goals: ReturnType<typeof summarize>["goals"];
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  canEdit: boolean;
  busy: boolean;
  onEditPercentages: () => void;
  onFilterGoal: (id: GoalId) => void;
}

export function GoalsSection({
  expanded,
  goals,
  plans,
  hidden,
  canEdit,
  busy,
  onEditPercentages,
  onFilterGoal,
}: Props) {
  const display = (value: number) => (hidden ? "R$ ••••" : money(value));
  return (
    <section className="goals-section" aria-labelledby="goals-title">
      <div className="section-heading">
        <div>
          <h2 id="goals-title">Metas do orçamento</h2>
        </div>
        {canEdit && (
          <button
            className="text-button"
            disabled={busy}
            onClick={onEditPercentages}
          >
            Editar meus percentuais
          </button>
        )}
      </div>
      <div className={`goals-grid ${expanded ? "expanded-goals" : ""}`}>
        {goals.map((goal) => {
          const plan = plans.find((item) => item.id === goal.id) ?? {
            planned: 0,
            percentage: null,
          };
          const overBudget = goal.amount > plan.planned;
          const overage = goal.amount - plan.planned;
          return (
            <button
              key={goal.id}
              className={`goal-card${overBudget ? " over-budget" : ""}`}
              aria-label={`${goal.name}: ${display(goal.amount)} de ${display(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
              style={
                {
                  "--goal-color": goal.color,
                  "--goal-bg": goal.background,
                } as React.CSSProperties
              }
              onClick={() => onFilterGoal(goal.id)}
            >
              <div className="goal-card-top">
                <span className="goal-icon">
                  <GoalIcon goal={goal.id} size={21} />
                </span>
                <span className="goal-number">
                  {plan.percentage === null
                    ? "—"
                    : `${plan.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                </span>
              </div>
              <h3>{goal.name}</h3>
              <strong>{display(goal.amount)}</strong>
              <p className="goal-budget">
                de {display(plan.planned)} planejados
              </p>
              <div className="goal-card-foot">
                <span>
                  {goal.count} {goal.count === 1 ? "transação" : "transações"}
                </span>
                {overBudget ? (
                  <span
                    className="goal-status"
                    title={
                      hidden
                        ? "Acima do planejado"
                        : `${display(overage)} acima do planejado`
                    }
                  >
                    <TriangleAlert size={14} />
                    <span>
                      {hidden
                        ? "Acima do planejado"
                        : `${display(overage)} acima`}
                    </span>
                  </span>
                ) : (
                  <ArrowUpRight size={16} />
                )}
              </div>
              <div className="goal-bar">
                <span
                  style={{
                    width: hidden
                      ? "0%"
                      : `${plan.planned > 0 ? Math.min(100, (goal.amount / plan.planned) * 100) : goal.amount > 0 ? 100 : 0}%`,
                  }}
                />
              </div>
              {expanded && (
                <p className="goal-description">{goal.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

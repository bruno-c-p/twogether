import { Button } from "@/components/ui/button";
import { OverviewCard } from "@/features/budget/components/overview-card";
import type { planGoals, summarize } from "@/features/budget/domain/calc";
import type { GoalId } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type GoalPlan = { planned: number; percentage: number | null };

function percentageLabel(percentage: number | null) {
  if (percentage === null) return "";

  return `${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

function progressWidth(amount: number, planned: number, hidden: boolean) {
  if (hidden) return "0%";

  if (planned > 0) return `${Math.min(100, (amount / planned) * 100)}%`;

  return amount > 0 ? "100%" : "0%";
}

function BudgetRow({
  goal,
  plan,
  hidden,
  displayMoney,
  onFilterGoal,
}: {
  goal: GoalSummary;
  plan: GoalPlan;
  hidden: boolean;
  displayMoney: (value: number) => string;
  onFilterGoal: (id: GoalId) => void;
}) {
  const over = goal.amount > plan.planned;
  const planned = `${displayMoney(plan.planned)} planejados`;

  return (
    <li>
      <button
        type="button"
        className="block w-full p-0 border-0 bg-transparent text-left text-text cursor-pointer"
        aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${planned}${over ? ", acima do planejado" : ""}`}
        onClick={() => onFilterGoal(goal.id)}
      >
        <span className="flex items-baseline gap-[10px] text-[14px] max-bp620:text-[13px]">
          <span className="flex items-baseline gap-[8px] min-w-0">
            <span
              className="size-[8px] rounded-full shrink-0 self-center"
              style={{ background: goal.color }}
              aria-hidden="true"
            />
            <span className="truncate">{goal.name}</span>
            <span className="text-[11px] text-text-muted max-bp620:hidden">
              {percentageLabel(plan.percentage)}
            </span>
          </span>
          <span className="ml-auto flex items-baseline gap-[10px]">
            <strong className="font-600 max-bp620:hidden">
              {displayMoney(goal.amount)}
            </strong>
            <span className="text-[12px] text-text-muted max-bp1000:hidden">
              de {displayMoney(plan.planned)}
            </span>
            <span
              className={cx(
                "text-[12px] min-w-[96px] text-right max-bp620:min-w-0",
                over ? "text-danger" : "text-text-muted",
              )}
            >
              {over
                ? `${displayMoney(goal.amount - plan.planned)} acima`
                : `restam ${displayMoney(plan.planned - goal.amount)}`}
            </span>
          </span>
        </span>
        <span
          className="block h-[4px] rounded-full mt-[8px] overflow-hidden"
          style={{ background: goal.background }}
          aria-hidden="true"
        >
          <span
            className={cx("block h-full rounded-full", over && "bg-danger")}
            style={{
              width: progressWidth(goal.amount, plan.planned, hidden),
              background: over ? undefined : goal.color,
            }}
          />
        </span>
      </button>
    </li>
  );
}

export function BudgetCard({
  summary,
  plans,
  hidden,
  displayMoney,
  canEdit,
  busy,
  onEditPercentages,
  onFilterGoal,
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  displayMoney: (value: number) => string;
  canEdit: boolean;
  busy: boolean;
  onEditPercentages: () => void;
  onFilterGoal: (id: GoalId) => void;
}) {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <OverviewCard aria-labelledby="budget-title">
      <div className="flex items-center justify-between gap-[12px] mb-[18px]">
        <h2
          id="budget-title"
          className="m-0 font-heading text-[19px] font-500 max-bp620:text-[16px]"
        >
          Orçamento do mês
        </h2>
        {canEdit && (
          <Button
            variant="text"
            className="text-[13px]"
            aria-label="Editar meus percentuais"
            disabled={busy}
            onClick={onEditPercentages}
          >
            Editar percentuais
          </Button>
        )}
      </div>
      <ul className="list-none m-0 p-0 flex flex-col gap-[16px] max-bp620:gap-[12px]">
        {summary.goals.map((goal) => (
          <BudgetRow
            key={goal.id}
            goal={goal}
            plan={plansById.get(goal.id) ?? { planned: 0, percentage: null }}
            hidden={hidden}
            displayMoney={displayMoney}
            onFilterGoal={onFilterGoal}
          />
        ))}
      </ul>
    </OverviewCard>
  );
}

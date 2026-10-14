import { Link } from "@tanstack/react-router";
import Big from "big.js";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverviewCard } from "@/features/budget/components/overview-card";
import type { planGoals, summarize } from "@/features/budget/domain/calc";
import { cx } from "@/lib/cx";
import { percentOf } from "@/lib/decimal";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type GoalPlan = { planned: number; percentage: number | null };

function percentageLabel(percentage: number | null) {
  if (percentage === null) return "";

  return `${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

function progressWidth(amount: number, planned: number, hidden: boolean) {
  if (hidden) return "0%";

  if (planned > 0) return `${Math.min(100, percentOf(amount, planned))}%`;

  return amount > 0 ? "100%" : "0%";
}

function BudgetRow({
  goal,
  plan,
  hidden,
  displayMoney,
}: {
  goal: GoalSummary;
  plan: GoalPlan;
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const over = goal.amount > plan.planned;
  const planned = `${displayMoney(plan.planned)} planejados`;

  return (
    <li>
      {/* Month and person carry over through retainSearchParams. */}
      <Link
        to="/transacoes"
        search={{ goal: goal.id }}
        className="block w-full text-left text-text"
        aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${planned}${over ? ", acima do planejado" : ""}`}
      >
        <span className="flex items-baseline gap-2 text-md max-bp620:text-sm">
          <span className="flex items-baseline gap-2 min-w-0">
            <span
              className="size-[8px] rounded-full shrink-0 self-center"
              style={{ background: goal.color }}
              aria-hidden="true"
            />
            <span className="truncate">{goal.name}</span>
            <span className="text-xs text-text-muted tabular-nums max-bp620:hidden">
              {percentageLabel(plan.percentage)}
            </span>
          </span>
          <span className="ml-auto flex items-baseline gap-2">
            <strong className="font-600 tabular-nums max-bp620:hidden">
              {displayMoney(goal.amount)}
            </strong>
            <span className="text-xs text-text-muted tabular-nums max-bp1000:hidden">
              de {displayMoney(plan.planned)}
            </span>
            <span
              className={cx(
                "text-xs tabular-nums min-w-[96px] text-right max-bp620:min-w-0",
                over ? "text-danger" : "text-text-muted",
              )}
            >
              {over
                ? `${displayMoney(new Big(goal.amount).minus(plan.planned).toNumber())} acima`
                : `restam ${displayMoney(new Big(plan.planned).minus(goal.amount).toNumber())}`}
            </span>
          </span>
        </span>
        <span
          className="block h-[4px] rounded-full mt-2 overflow-clip"
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
      </Link>
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
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  displayMoney: (value: number) => string;
  canEdit: boolean;
  busy: boolean;
  onEditPercentages: () => void;
}) {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <OverviewCard aria-labelledby="budget-title">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2
          id="budget-title"
          className="m-0 font-heading text-lg font-700 tracking-[-0.02em]"
        >
          Orçamento do mês
        </h2>
        {canEdit && (
          <Button
            variant="icon"
            className="text-text-muted @hover:text-text"
            aria-label="Editar meus percentuais"
            title="Editar meus percentuais"
            disabled={busy}
            onClick={onEditPercentages}
          >
            <Pencil size={17} />
          </Button>
        )}
      </div>
      <ul className="list-none m-0 p-0 flex flex-col gap-4 max-bp620:gap-3">
        {summary.goals.map((goal) => (
          <BudgetRow
            key={goal.id}
            goal={goal}
            plan={plansById.get(goal.id) ?? { planned: 0, percentage: null }}
            hidden={hidden}
            displayMoney={displayMoney}
          />
        ))}
      </ul>
    </OverviewCard>
  );
}

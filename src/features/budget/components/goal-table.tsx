import type { planGoals, summarize } from "@/features/budget/domain/calc";
import {
  goalProgress,
  percentLabel,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import type { GoalId } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type Plan = ReturnType<typeof planGoals>[number];

const COLUMNS =
  "bp1000:grid-cols-[minmax(0,1.6fr)_120px_140px_140px_minmax(0,1.3fr)]";

const ROW = cx(
  "grid grid-cols-3 gap-x-[16px] gap-y-[12px] bp1000:gap-x-[20px] items-center",
  "px-[24px] py-[16px] max-bp620:px-[16px]",
  COLUMNS,
);

const CELL_LABEL = "block bp1000:hidden text-[11px] text-text-muted mb-[2px]";

const PROGRESS_HIDDEN = "Acima do planejado";

function Progress({
  goal,
  planned,
  hidden,
  displayMoney,
}: {
  goal: GoalSummary;
  planned: number;
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const progress = goalProgress(goal.amount, planned);
  const over = progress.over > 0;
  let text: string;

  if (hidden) text = over ? PROGRESS_HIDDEN : "";
  else if (over)
    text = `${progress.percent === null ? "" : `${progress.percent}% · `}${displayMoney(progress.over)} acima`;
  else
    text = `${progress.percent}% · restam ${displayMoney(progress.remaining)}`;

  return (
    <span className="col-span-3 bp1000:col-span-1 flex flex-col gap-[6px]">
      <span
        className="block h-[6px] rounded-full overflow-hidden"
        style={{ background: over ? "var(--danger-soft)" : goal.background }}
      >
        <span
          className={cx("block h-full rounded-full", over && "bg-danger")}
          style={{
            width: hidden ? "0%" : `${progress.fill}%`,
            background: over ? undefined : goal.color,
          }}
        />
      </span>
      <span
        className={cx(
          "text-[13px] tabular-nums",
          over ? "text-danger font-600" : "text-text-muted",
        )}
      >
        {text}
      </span>
    </span>
  );
}

function GoalRow({
  goal,
  plan,
  hidden,
  displayMoney,
  onFilterGoal,
}: {
  goal: GoalSummary;
  plan: Plan;
  hidden: boolean;
  displayMoney: (value: number) => string;
  onFilterGoal: (id: GoalId) => void;
}) {
  const overBudget = goal.amount > plan.planned;

  return (
    <button
      className={cx(
        ROW,
        "w-full text-left bg-transparent border-0 border-b border-solid border-border text-text",
        "cursor-pointer hover:bg-surface-soft",
      )}
      aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
      onClick={() => onFilterGoal(goal.id)}
    >
      <span className="col-span-3 bp1000:col-span-1 flex items-center gap-[12px] min-w-0">
        <span
          className="w-[34px] h-[34px] rounded-[10px] grid place-items-center shrink-0"
          style={{ background: goal.background }}
        >
          <span
            className="w-[10px] h-[10px] rounded-full"
            style={{ background: goal.color }}
          />
        </span>
        <span className="flex flex-col gap-[2px] min-w-0">
          <span className="text-[15px] font-600">{goal.name}</span>
          <span className="text-[13px] text-text-muted">
            <span>{goal.description}</span> · {goal.count}{" "}
            {goal.count === 1 ? "transação" : "transações"}
          </span>
        </span>
      </span>
      <span className="text-[15px] font-600 tabular-nums bp1000:text-center">
        <span className={CELL_LABEL}>Percentual</span>
        {percentLabel(plan.percentage)}
      </span>
      <span className="text-[15px] text-text-muted tabular-nums bp1000:text-right">
        <span className={CELL_LABEL}>Planejado</span>
        {displayMoney(plan.planned)}
      </span>
      <span className="text-[15px] font-600 tabular-nums bp1000:text-right">
        <span className={CELL_LABEL}>Gasto</span>
        {displayMoney(goal.amount)}
      </span>
      <Progress
        goal={goal}
        planned={plan.planned}
        hidden={hidden}
        displayMoney={displayMoney}
      />
    </button>
  );
}

export function GoalTable({
  summary,
  plans,
  hidden,
  displayMoney,
  onFilterGoal,
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  displayMoney: (value: number) => string;
  onFilterGoal: (id: GoalId) => void;
}) {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  const rows = summary.goals.map((goal) => ({
    goal,
    plan: plansById.get(goal.id) ?? {
      id: goal.id,
      planned: 0,
      percentage: null,
    },
  }));

  const total = sumPercentages(rows.map(({ plan }) => plan.percentage));

  return (
    <section
      className="bg-surface border border-solid border-border rounded-[18px] overflow-hidden"
      aria-label="Metas do orçamento"
    >
      <div
        className={cx(
          "hidden bp1000:grid gap-x-[20px] px-[24px] py-[12px] bg-surface-soft",
          "border-b border-solid border-border text-[12px] tracking-[0.06em] uppercase text-text-muted",
          COLUMNS,
        )}
      >
        <span>Meta</span>
        <span className="text-center">Percentual</span>
        <span className="text-right">Planejado</span>
        <span className="text-right">Gasto</span>
        <span>Andamento</span>
      </div>
      {rows.map(({ goal, plan }) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          plan={plan}
          hidden={hidden}
          displayMoney={displayMoney}
          onFilterGoal={onFilterGoal}
        />
      ))}
      <div
        className={cx(ROW, "bg-surface-soft text-[15px] font-600 tabular-nums")}
      >
        <span className="col-span-3 bp1000:col-span-1">Total</span>
        <span
          className={cx(
            "bp1000:text-center",
            total === 100 ? "text-green" : "text-warning",
          )}
        >
          {percentLabel(total)}
        </span>
        <span className="bp1000:text-right">
          {displayMoney(rows.reduce((sum, { plan }) => sum + plan.planned, 0))}
        </span>
        <span className="bp1000:text-right">
          {displayMoney(summary.expenses)}
        </span>
      </div>
    </section>
  );
}

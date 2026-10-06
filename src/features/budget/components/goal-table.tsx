import { Link } from "@tanstack/react-router";
import type { planGoals, summarize } from "@/features/budget/domain/calc";
import {
  goalProgress,
  percentLabel,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import { cx } from "@/lib/cx";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type Plan = ReturnType<typeof planGoals>[number];

const COLUMNS =
  "bp1000:grid-cols-[minmax(0,1.6fr)_120px_140px_140px_minmax(0,1.3fr)]";

const ROW = cx(
  "grid grid-cols-3 gap-x-4 gap-y-3 bp1000:gap-x-5 items-center",
  "px-6 py-4 max-bp620:px-4",
  COLUMNS,
);

const CELL_LABEL = "block bp1000:hidden text-xs text-text-muted mb-0.5";

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
  // Nothing planned means there is no share to show, only the amount.
  const share = progress.percent === null ? "" : `${progress.percent}% · `;
  let text: string;

  if (hidden) text = over ? PROGRESS_HIDDEN : "";
  else if (over) text = `${share}${displayMoney(progress.over)} acima`;
  else text = `${share}restam ${displayMoney(progress.remaining)}`;

  return (
    <span className="col-span-3 bp1000:col-span-1 flex flex-col gap-1.5">
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
          "text-sm tabular-nums",
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
}: {
  goal: GoalSummary;
  plan: Plan;
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const overBudget = goal.amount > plan.planned;

  return (
    // Month and person carry over through retainSearchParams.
    <Link
      to="/transacoes"
      search={{ goal: goal.id }}
      className={cx(
        ROW,
        "w-full text-left border-0 border-b border-solid border-border text-text",
        "hover:bg-surface-soft",
      )}
      aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
    >
      <span className="col-span-3 bp1000:col-span-1 flex items-center gap-3 min-w-0">
        <span
          className="w-[34px] h-[34px] rounded-md grid place-items-center shrink-0"
          style={{ background: goal.background }}
        >
          <span
            className="w-[10px] h-[10px] rounded-full"
            style={{ background: goal.color }}
          />
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-md font-600">{goal.name}</span>
          <span className="text-sm text-text-muted">
            <span>{goal.description}</span> · {goal.count}{" "}
            {goal.count === 1 ? "transação" : "transações"}
          </span>
        </span>
      </span>
      <span className="text-md font-600 tabular-nums bp1000:text-center">
        <span className={CELL_LABEL}>Percentual</span>
        {percentLabel(plan.percentage)}
      </span>
      <span className="text-md text-text-muted tabular-nums bp1000:text-right">
        <span className={CELL_LABEL}>Planejado</span>
        {displayMoney(plan.planned)}
      </span>
      <span className="text-md font-600 tabular-nums bp1000:text-right">
        <span className={CELL_LABEL}>Gasto</span>
        {displayMoney(goal.amount)}
      </span>
      <Progress
        goal={goal}
        planned={plan.planned}
        hidden={hidden}
        displayMoney={displayMoney}
      />
    </Link>
  );
}

export function GoalTable({
  summary,
  plans,
  hidden,
  displayMoney,
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  displayMoney: (value: number) => string;
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
      className="bg-surface border border-solid border-border rounded-lg overflow-hidden"
      aria-label="Metas do orçamento"
    >
      <div
        className={cx(
          "hidden bp1000:grid gap-x-5 px-6 py-3 bg-surface-soft",
          "border-b border-solid border-border text-xs tracking-[0.06em] uppercase text-text-muted",
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
        />
      ))}
      <div
        className={cx(ROW, "bg-surface-soft text-md font-600 tabular-nums")}
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

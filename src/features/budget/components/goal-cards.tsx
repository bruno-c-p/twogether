import { Link } from "@tanstack/react-router";
import { PersonAvatar } from "@/components/ui/person-avatar";
import type { planGoals, summarize } from "@/features/budget/domain/calc";
import {
  goalProgress,
  percentLabel,
  progressText,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import type { Member } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type Plan = ReturnType<typeof planGoals>[number];

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
  const text = progressText(progress, hidden, displayMoney);

  return (
    <>
      <span
        className="block h-[10px] rounded-full overflow-hidden"
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
      <span className="flex items-center justify-between gap-3 text-xs text-text-muted">
        <span>
          {goal.count} {goal.count === 1 ? "transação" : "transações"}
        </span>
        <span
          className={cx(
            "tabular-nums text-right",
            over &&
              text &&
              "px-2 py-0.5 rounded-full bg-danger-soft text-danger font-700",
          )}
        >
          {text}
        </span>
      </span>
    </>
  );
}

function GoalCard({
  goal,
  plan,
  members,
  hidden,
  displayMoney,
}: {
  goal: GoalSummary;
  plan: Plan;
  members: Member[];
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
        "flex flex-col gap-3 p-5 bg-surface text-text rounded-lg",
        "border border-solid border-border hover:border-line-strong",
      )}
      aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span
          className="w-[40px] h-[40px] rounded-md grid place-items-center shrink-0"
          style={{ background: goal.background }}
        >
          <span
            className="w-[10px] h-[10px] rounded-full"
            style={{ background: goal.color }}
          />
        </span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-md font-700">{goal.name}</span>
          <span className="text-xs text-text-muted truncate">
            {goal.description}
          </span>
        </span>
        <span className="text-xl font-800 tracking-[-0.03em] tabular-nums shrink-0">
          {percentLabel(plan.percentage)}
        </span>
      </span>
      <span className="flex items-baseline justify-between gap-x-3 flex-wrap">
        <span className="text-2xl font-800 tracking-[-0.035em] tabular-nums">
          {displayMoney(goal.amount)}
        </span>
        <span className="text-sm text-text-muted tabular-nums">
          de {displayMoney(plan.planned)}
        </span>
      </span>
      {plan.shares.length > 1 && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted tabular-nums">
          {plan.shares.map((share) => {
            const position = members.findIndex(
              (member) => member.id === share.memberId,
            );

            const name = members[position]?.name;

            return (
              <span
                key={share.memberId}
                className="inline-flex items-center gap-1.5"
              >
                <PersonAvatar
                  aria-hidden="true"
                  name={name}
                  position={position}
                  className="w-[20px] h-[20px] text-xs"
                />
                <span className="sr-only">{name ?? "Pessoa do casal"}: </span>
                <span className="text-text font-600">
                  {displayMoney(share.planned)}
                </span>
                ({percentLabel(share.percentage)})
              </span>
            );
          })}
        </span>
      )}
      <Progress
        goal={goal}
        planned={plan.planned}
        hidden={hidden}
        displayMoney={displayMoney}
      />
    </Link>
  );
}

export function GoalCards({
  summary,
  plans,
  members,
  hidden,
  displayMoney,
}: {
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  members: Member[];
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  const rows = summary.goals.map((goal) => ({
    goal,
    plan: plansById.get(goal.id) ?? {
      id: goal.id,
      planned: 0,
      shares: [],
      percentage: null,
    },
  }));

  const total = sumPercentages(rows.map(({ plan }) => plan.percentage));

  return (
    <section aria-label="Metas do orçamento" className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4 max-bp1190:grid-cols-2 max-bp620:grid-cols-1">
        {rows.map(({ goal, plan }) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            plan={plan}
            members={members}
            hidden={hidden}
            displayMoney={displayMoney}
          />
        ))}
      </div>
      <div
        className={cx(
          "flex items-baseline gap-x-8 gap-y-2 flex-wrap px-6 py-4 max-bp620:px-4",
          "bg-surface border border-solid border-border rounded-lg tabular-nums",
        )}
      >
        <span className="font-700 mr-auto">
          Total{" "}
          <span className={total === 100 ? "text-text" : "text-warning"}>
            {percentLabel(total)}
          </span>
        </span>
        <span className="text-sm text-text-muted">
          Planejado{" "}
          <span className="text-lg font-800 text-text">
            {displayMoney(
              rows.reduce((sum, { plan }) => sum + plan.planned, 0),
            )}
          </span>
        </span>
        <span className="text-sm text-text-muted">
          Gasto{" "}
          <span className="text-lg font-800 text-text">
            {displayMoney(summary.expenses)}
          </span>
        </span>
      </div>
    </section>
  );
}

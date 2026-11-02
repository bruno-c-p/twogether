import { createLink } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardLink,
  CardTitle,
} from "@/components/glaze/ui/card";
import { Progress } from "@/components/glaze/ui/progress";
import { Status } from "@/components/glaze/ui/status";
import { PersonAvatar } from "@/components/app/person-avatar";
import type { planGoals, summarize } from "@/features/budget/domain/calc";
import {
  goalProgress,
  percentLabel,
  progressText,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import type { Member } from "@/features/budget/domain/types";
import { sum, ZERO_CENTS } from "@/lib/decimal";

type GoalSummary = ReturnType<typeof summarize>["goals"][number];

type Plan = ReturnType<typeof planGoals>[number];

const GoalLink = createLink(CardLink);

function GoalProgress({
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
      <Progress
        mode="meter"
        aria-label={`Gasto de ${goal.name}`}
        value={hidden ? 0 : progress.fill}
        warnAt={null}
        failAt={null}
        status={over ? "fail" : undefined}
        statusLabel="Acima do planejado"
      />
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 type-caption text-text-2">
        <span>
          {goal.count} {goal.count === 1 ? "transação" : "transações"}
        </span>
        {over && text ? (
          <Status status="fail" size="sm" className="tabular-nums">
            {text}
          </Status>
        ) : (
          <span className="tabular-nums">{text}</span>
        )}
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
    <Card>
      <CardHeader>
        <CardTitle>
          {/* Month and person carry over through retainSearchParams. */}
          <GoalLink
            to="/transacoes"
            search={{ goal: goal.id }}
            aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
          >
            {goal.name}
          </GoalLink>
        </CardTitle>
        <CardDescription className="truncate">
          {goal.description}
        </CardDescription>
        <span className="col-start-2 row-span-2 row-start-1 type-heading tabular-nums">
          {percentLabel(plan.percentage)}
        </span>
      </CardHeader>
      <CardContent>
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="type-heading tabular-nums">
            {displayMoney(goal.amount)}
          </span>
          <span className="type-body-sm text-text-2 tabular-nums">
            de {displayMoney(plan.planned)}
          </span>
        </span>
        {plan.shares.length > 1 && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-text-2 tabular-nums">
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
                    className="size-5"
                  />
                  <span className="sr-only">{name ?? "Pessoa do casal"}: </span>
                  <span className="text-text-1">
                    {displayMoney(share.planned)}
                  </span>
                  ({percentLabel(share.percentage)})
                </span>
              );
            })}
          </span>
        )}
        <GoalProgress
          goal={goal}
          planned={plan.planned}
          hidden={hidden}
          displayMoney={displayMoney}
        />
      </CardContent>
    </Card>
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
      planned: ZERO_CENTS,
      shares: [],
      percentage: null,
    },
  }));

  const total = sumPercentages(rows.map(({ plan }) => plan.percentage));

  return (
    <section aria-label="Metas do orçamento" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 px-3 type-body-sm text-text-2 tabular-nums">
        <span className="me-auto type-label text-text-1">
          Total{" "}
          {total === 100 ? (
            percentLabel(total)
          ) : (
            <Status status="warn">{percentLabel(total)}</Status>
          )}
        </span>
        <span>
          Planejado{" "}
          <span className="type-label-lg text-text-1">
            {displayMoney(sum(rows.map(({ plan }) => plan.planned)))}
          </span>
        </span>
        <span>
          Gasto{" "}
          <span className="type-label-lg text-text-1">
            {displayMoney(summary.expenses)}
          </span>
        </span>
      </div>
    </section>
  );
}

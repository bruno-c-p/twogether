import { GOALS } from "@/features/budget/constants";
import {
  incomeStatus,
  percentLabel,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import type { planGoals } from "@/features/budget/domain/calc";
import { cx } from "@/lib/cx";

export function IncomeDistribution({
  plans,
}: {
  plans: ReturnType<typeof planGoals>;
}) {
  const percentages = new Map(plans.map((plan) => [plan.id, plan.percentage]));
  const total = sumPercentages(plans.map((plan) => plan.percentage));

  return (
    <section
      className="bg-surface border border-solid border-border rounded-lg p-6 max-bp620:p-4 flex flex-col gap-4 mb-6"
      aria-labelledby="income-distribution-title"
    >
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <h2
          id="income-distribution-title"
          className="text-md font-600 font-sans"
        >
          Distribuição da renda
        </h2>
        <span
          className={cx(
            "text-md max-bp620:text-sm",
            total === 100 ? "text-green" : "text-warning",
          )}
        >
          {percentLabel(total)} · {incomeStatus(total)}
        </span>
      </div>
      <div
        className="flex h-[14px] rounded-full overflow-hidden bg-surface-soft gap-0.5"
        role="img"
        aria-label={GOALS.map(
          (goal) =>
            `${goal.name} ${percentLabel(percentages.get(goal.id) ?? 0)}`,
        ).join(", ")}
      >
        {GOALS.map((goal) => (
          <span
            key={goal.id}
            className="block h-full"
            style={{
              background: goal.color,
              width: `${percentages.get(goal.id) ?? 0}%`,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted list-none m-0 p-0">
        {GOALS.map((goal) => (
          <li key={goal.id} className="flex items-center gap-1.5">
            <span
              className="w-[8px] h-[8px] rounded-full shrink-0"
              style={{ background: goal.color }}
            />
            {goal.name}
            <strong className="font-600 text-text">
              {percentLabel(percentages.get(goal.id) ?? null)}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

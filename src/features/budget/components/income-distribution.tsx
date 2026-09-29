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
      className="bg-surface border border-solid border-border rounded-[18px] p-[24px] max-bp620:p-[18px] flex flex-col gap-[14px] mb-[24px]"
      aria-labelledby="income-distribution-title"
    >
      <div className="flex justify-between items-baseline gap-[12px] flex-wrap">
        <h2
          id="income-distribution-title"
          className="text-[15px] font-600 font-sans"
        >
          Distribuição da renda
        </h2>
        <span
          className={cx(
            "text-[14px] max-bp620:text-[13px]",
            total === 100 ? "text-green" : "text-warning",
          )}
        >
          {percentLabel(total)} · {incomeStatus(total)}
        </span>
      </div>
      <div
        className="flex h-[14px] rounded-full overflow-hidden bg-surface-soft gap-[2px]"
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
      <ul className="flex flex-wrap gap-x-[18px] gap-y-[8px] text-[13px] text-text-muted list-none m-0 p-0">
        {GOALS.map((goal) => (
          <li key={goal.id} className="flex items-center gap-[6px]">
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

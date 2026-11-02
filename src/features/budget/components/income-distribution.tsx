import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import { Status } from "@/components/glaze/ui/status";
import { GOALS } from "@/features/budget/constants";
import {
  incomeStatus,
  percentLabel,
  sumPercentages,
} from "@/features/budget/domain/goal-progress";
import type { planGoals } from "@/features/budget/domain/calc";

export function IncomeDistribution({
  plans,
}: {
  plans: ReturnType<typeof planGoals>;
}) {
  const percentages = new Map(plans.map((plan) => [plan.id, plan.percentage]));
  const total = sumPercentages(plans.map((plan) => plan.percentage));

  return (
    <Card
      role="region"
      aria-labelledby="income-distribution-title"
      className="mb-6"
    >
      <CardHeader>
        <CardTitle>
          <h2 id="income-distribution-title">Distribuição da renda</h2>
        </CardTitle>
        <CardDescription>
          <Status status={total === 100 ? "ok" : "warn"} size="sm">
            {percentLabel(total)} · {incomeStatus(total)}
          </Status>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 type-body-sm text-text-2">
          {GOALS.map((goal) => (
            <li key={goal.id} className="flex items-baseline gap-1.5">
              {goal.name}
              <strong className="font-medium text-text-1 tabular-nums">
                {percentLabel(percentages.get(goal.id) ?? null)}
              </strong>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

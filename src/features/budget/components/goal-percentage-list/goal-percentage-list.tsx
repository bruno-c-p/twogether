import { GOALS } from "@/features/budget/constants";
import type { GoalId, GoalPercentages } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/goal-percentage-list/goal-percentage-list.module.css";

export function GoalPercentageList({
  values,
  disabled,
  onChange,
}: {
  values: GoalPercentages;
  disabled: boolean;
  onChange: (goal: GoalId, value: number) => void;
}) {
  return (
    <div className={styles.percentageFields}>
      {GOALS.map((goal) => (
        <label key={goal.id} htmlFor={`percentage-${goal.id}`}>
          <span>{goal.name}</span>
          <span>
            <input
              id={`percentage-${goal.id}`}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              disabled={disabled}
              required
              value={Number.isNaN(values[goal.id]) ? "" : values[goal.id]}
              onChange={(event) =>
                onChange(goal.id, event.target.valueAsNumber)
              }
            />{" "}
            %
          </span>
        </label>
      ))}
    </div>
  );
}

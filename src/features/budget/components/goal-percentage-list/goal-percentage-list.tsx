import { Field, FieldGroup, FieldLabel } from "@/components/glaze/ui/field";
import { NumberInput } from "@/components/glaze/ui/number-input";
import { GOALS } from "@/features/budget/constants";
import type { GoalId, GoalPercentages } from "@/features/budget/domain/types";

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
    <FieldGroup className="gap-3">
      {GOALS.map((goal) => (
        <Field
          key={goal.id}
          orientation="horizontal"
          className="flex-wrap justify-between gap-y-1.5"
        >
          <FieldLabel>{goal.name}</FieldLabel>
          <NumberInput
            className="w-28"
            unit="%"
            min={0}
            max={100}
            step={0.01}
            locale="pt-BR"
            disabled={disabled}
            required
            value={Number.isNaN(values[goal.id]) ? null : values[goal.id]}
            onValueChange={(value) => onChange(goal.id, value ?? Number.NaN)}
          />
        </Field>
      ))}
    </FieldGroup>
  );
}

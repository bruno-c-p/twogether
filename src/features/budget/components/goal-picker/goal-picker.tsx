import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Chip } from "@/components/glaze/ui/chip";
import { FieldLegend, FieldSet } from "@/components/glaze/ui/field";
import type { Goal, GoalId } from "@/features/budget/domain/types";

export function GoalPicker({
  goals,
  value,
  onChange,
}: {
  goals: Goal[];
  value: GoalId | null;
  onChange: (goal: GoalId) => void;
}) {
  return (
    <FieldSet className="gap-1.5">
      <FieldLegend variant="label">Para qual meta?</FieldLegend>
      <ToggleGroup
        className="flex flex-wrap items-center gap-1"
        aria-label="Para qual meta?"
        value={value ? [value] : []}
        onValueChange={(values) => {
          const next = goals.find((goal) => goal.id === values[0]);

          if (next) onChange(next.id);
        }}
      >
        {goals.map((item) => (
          <Chip key={item.id} value={item.id}>
            {item.name}
          </Chip>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
}

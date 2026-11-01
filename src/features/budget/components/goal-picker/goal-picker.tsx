import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Fieldset } from "@base-ui/react/fieldset";
import { Check } from "lucide-react";
import type { Goal, GoalId } from "@/features/budget/domain/types";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import styles from "@/features/budget/components/goal-picker/goal-picker.module.css";

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
    <Fieldset.Root className={styles.goalField}>
      <Fieldset.Legend render={<legend />}>Para qual meta?</Fieldset.Legend>
      <ToggleGroup
        className={styles.goalOptions}
        aria-label="Para qual meta?"
        value={value ? [value] : []}
        onValueChange={(values) => {
          const next = goals.find((goal) => goal.id === values[0]);

          if (next) onChange(next.id);
        }}
      >
        {goals.map((item) => (
          <Toggle
            key={item.id}
            type="button"
            className={`${styles.goalOption} ${value === item.id ? styles.selected : ""}`}
            style={{
              "--goal-color": item.color,
              "--goal-bg": item.background,
            }}
            value={item.id}
          >
            <GoalIcon goal={item.id} size={19} />
            <span>{item.name}</span>
            {value === item.id && <Check size={14} />}
          </Toggle>
        ))}
      </ToggleGroup>
    </Fieldset.Root>
  );
}

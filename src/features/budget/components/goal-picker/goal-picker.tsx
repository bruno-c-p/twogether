import { Check } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import type { GoalId } from "@/features/budget/domain/types";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import styles from "@/features/budget/components/goal-picker/goal-picker.module.css";

export function GoalPicker({
  value,
  onChange,
}: {
  value: GoalId | null;
  onChange: (goal: GoalId) => void;
}) {
  return (
    <fieldset className={styles.goalField}>
      <legend>Para qual meta?</legend>
      <div className={styles.goalOptions}>
        {GOALS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.goalOption} ${value === item.id ? styles.selected : ""}`}
            style={{
              "--goal-color": item.color,
              "--goal-bg": item.background,
            }}
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
          >
            <GoalIcon goal={item.id} size={19} />
            <span>{item.name}</span>
            {value === item.id && <Check size={14} />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

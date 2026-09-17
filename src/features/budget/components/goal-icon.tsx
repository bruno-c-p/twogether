import type { GoalId } from "@/features/budget/domain/types";
import { GOAL_ICONS } from "@/features/budget/constants";

export function GoalIcon({ goal, size = 20 }: { goal: GoalId; size?: number }) {
  const Icon = GOAL_ICONS[goal];
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true" />;
}

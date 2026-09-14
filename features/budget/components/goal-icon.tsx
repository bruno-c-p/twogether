import { Armchair, BookOpen, House, Target, Sprout, Wine } from "lucide-react";
import type { GoalId } from "../types";

const icons = {
  fixed: House,
  targets: Target,
  pleasure: Wine,
  comfort: Armchair,
  knowledge: BookOpen,
  freedom: Sprout,
};
export function GoalIcon({ goal, size = 20 }: { goal: GoalId; size?: number }) {
  const Icon = icons[goal];
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true" />;
}

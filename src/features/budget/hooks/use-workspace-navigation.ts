import { useNavigate } from "@tanstack/react-router";
import { WORKSPACE_PATHS } from "@/features/budget/constants";
import type { GoalId, View } from "@/features/budget/domain/types";

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Month and person carry over through the workspace layout's
// retainSearchParams; page filters are dropped on purpose.
export function useWorkspaceNavigation() {
  const navigate = useNavigate();

  return {
    openView: (view: View) => {
      void navigate({ to: WORKSPACE_PATHS[view] });
      scrollTop();
    },
    filterGoal: (goal: GoalId) => {
      void navigate({ to: WORKSPACE_PATHS.transactions, search: { goal } });
      scrollTop();
    },
  };
}

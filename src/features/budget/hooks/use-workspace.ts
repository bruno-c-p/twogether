import { createContext, use } from "react";
import type { Notice } from "@/features/budget/components/notice";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import type { WorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import type { WorkspaceData } from "@/features/budget/hooks/use-workspace-data";
import type { WorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";

// State the workspace layout owns and every page, dialog and toast reads:
// the snapshot, derived month data, mutations, dialogs, actions, the
// notice and the hide-values toggle.
export interface Workspace {
  budget: BudgetController;
  data: WorkspaceData;
  month: string;
  memberFilter: string;
  busy: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  displayMoney: (value: number) => string;
  mutations: BudgetMutations;
  dialogs: WorkspaceDialogs;
  actions: WorkspaceActions;
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
}

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const workspace = use(WorkspaceContext);

  if (!workspace) throw new Error("useWorkspace needs the workspace layout.");

  return workspace;
}

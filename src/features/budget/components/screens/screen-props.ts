import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import type { WorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import type { WorkspaceData } from "@/features/budget/hooks/use-workspace-data";
import type { WorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";

export interface ScreenProps {
  budget: BudgetController;
  search: ReturnType<typeof useBudgetSearch>;
  data: WorkspaceData;
  month: string;
  busy: boolean;
  hidden: boolean;
  displayMoney: (value: number) => string;
  dialogs: WorkspaceDialogs;
  actions: WorkspaceActions;
}

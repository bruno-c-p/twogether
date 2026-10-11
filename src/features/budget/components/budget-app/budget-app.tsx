import type { ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import {
  useBudget,
  type BudgetController,
} from "@/features/budget/hooks/use-budget";
import {
  useBudgetMutations,
  type BudgetMutations,
} from "@/features/budget/hooks/use-budget-mutations";
import {
  WorkspaceContext,
  type Workspace,
} from "@/features/budget/hooks/use-workspace";
import { useWorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import { useWorkspaceData } from "@/features/budget/hooks/use-workspace-data";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { useHiddenValues } from "@/features/budget/hooks/use-hidden-values";
import { useWorkspaceSearch } from "@/features/budget/hooks/use-workspace-search";
import { money } from "@/features/budget/domain/format";
import { AccountDrawer } from "@/features/auth/components/account-drawer";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { MonthFilter } from "@/features/budget/components/month-filter";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell";
import styles from "@/features/budget/components/budget-app/budget-app.module.css";

// The layout route renders this only once the URL carries a month.
export function BudgetApp({ month }: { month: string }) {
  const budget = useBudget();

  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
      month={month}
      account={
        <AccountDrawer user={budget.user} members={budget.household.members} />
      }
    />
  );
}

function listErrorFor(mutations: BudgetMutations, deleting: boolean) {
  return (
    mutations.restoreTx.error ||
    mutations.unsettleTx.error ||
    (deleting ? "" : mutations.deleteTx.error)
  );
}

export function BudgetWorkspace({
  budget,
  month,
  account,
}: {
  budget: BudgetController;
  month: string;
  account: ReactNode;
}) {
  const mutations = useBudgetMutations();
  const search = useWorkspaceSearch();
  const dialogs = useWorkspaceDialogs(mutations, budget.state.transactions);
  const { hidden, toggle } = useHiddenValues();
  const data = useWorkspaceData(budget, month, search.memberFilter);

  const actions = useWorkspaceActions({
    budget,
    dialogs,
    mutations,
    setMonth: search.setMonth,
  });

  const alert =
    budget.syncError || listErrorFor(mutations, Boolean(dialogs.deleting));

  const workspace: Workspace = {
    budget,
    data,
    month,
    memberFilter: search.memberFilter,
    busy: mutations.busy,
    hidden,
    onToggleHidden: toggle,
    displayMoney: (value) => (hidden ? "R$ ••••" : money(value)),
    mutations,
    dialogs,
    actions,
  };

  return (
    <WorkspaceContext value={workspace}>
      <WorkspaceShell
        account={account}
        controls={
          <>
            <MonthFilter month={month} setMonth={search.setMonth} />
            <MemberFilter
              members={budget.household.members}
              userId={budget.user.id}
              value={search.memberFilter}
              onChange={search.setMemberFilter}
            />
          </>
        }
      >
        {alert && (
          <div role="alert" className={styles.storageError}>
            {alert}
          </div>
        )}
        <Outlet />
      </WorkspaceShell>
    </WorkspaceContext>
  );
}

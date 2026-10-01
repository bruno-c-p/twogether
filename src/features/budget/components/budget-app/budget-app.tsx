import { useState, type ReactNode } from "react";
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
import { useWorkspaceNavigation } from "@/features/budget/hooks/use-workspace-navigation";
import { useWorkspaceSearch } from "@/features/budget/hooks/use-workspace-search";
import { currentMonth, money } from "@/features/budget/domain/format";
import { AccountDrawer } from "@/features/auth/components/account-drawer";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { MonthFilter } from "@/features/budget/components/month-filter";
import { NoticeToast, useNotice } from "@/features/budget/components/notice";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell";
import styles from "@/features/budget/components/budget-app/budget-app.module.css";

export function BudgetApp() {
  const budget = useBudget();

  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
      account={
        <AccountDrawer user={budget.user} members={budget.household.members} />
      }
    />
  );
}

function listErrorFor(mutations: BudgetMutations, deleting: boolean) {
  return (
    mutations.deleteAcc.error ||
    mutations.restoreTx.error ||
    mutations.unsettleTx.error ||
    (deleting ? "" : mutations.deleteTx.error)
  );
}

export function BudgetWorkspace({
  budget,
  account,
}: {
  budget: BudgetController;
  account?: ReactNode;
}) {
  const mutations = useBudgetMutations();
  const search = useWorkspaceSearch();
  const navigation = useWorkspaceNavigation();
  const dialogs = useWorkspaceDialogs();
  const { notice, setNotice } = useNotice();
  const [hidden, setHidden] = useState(false);
  const month = search.month ?? currentMonth();

  const data = useWorkspaceData(
    budget,
    month,
    search.memberFilter,
    dialogs.deleting,
  );

  const actions = useWorkspaceActions({
    budget,
    dialogs,
    mutations,
    following: data.following,
    notice,
    setNotice,
    setMonth: search.setMonth,
    openView: navigation.openView,
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
    onToggleHidden: () => setHidden(!hidden),
    displayMoney: (value) => (hidden ? "R$ ••••" : money(value)),
    dialogs,
    actions,
    navigation,
  };

  return (
    <WorkspaceShell
      account={account}
      onRegister={actions.openRegister}
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
      overlays={
        <>
          <TransactionFlows
            budget={budget}
            dialogs={dialogs}
            mutations={mutations}
            actions={actions}
            month={month}
            allTags={data.allTags}
            following={data.following}
          />
          {notice && (
            <NoticeToast
              notice={notice}
              onUndo={() => void actions.undoNotice()}
              onDismiss={() => setNotice(null)}
            />
          )}
        </>
      }
    >
      {alert && (
        <div role="alert" className={styles.storageError}>
          {alert}
        </div>
      )}
      <WorkspaceContext value={workspace}>
        <Outlet />
      </WorkspaceContext>
    </WorkspaceShell>
  );
}

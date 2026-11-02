import type { ComponentType, ReactNode } from "react";
import { Alert, AlertTitle } from "@/components/glaze/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useRouter } from "@tanstack/react-router";
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
import { WORKSPACE_PATHS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type { Member } from "@/features/budget/domain/types";
import {
  prefetchMonth,
  prefetchNearbyMonths,
} from "@/features/budget/workspace";
import { useBrowserSync } from "@/lib/use-browser-sync";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { MonthFilter } from "@/features/budget/components/month-filter";
import {
  WorkspaceShell,
  type AccountPlacement,
} from "@/features/budget/components/workspace-shell";

// The layout route renders this only once the URL carries a month.
export function BudgetApp({
  month,
  account: Account,
}: {
  month: string;
  account: ComponentType<{
    placement: AccountPlacement;
    user: Member;
    members: Member[];
  }>;
}) {
  const budget = useBudget(month);
  const router = useRouter();

  // Every page's code, once the first page is on screen, so opening another
  // page for the first time does not wait for its download.
  useBrowserSync(["workspace-pages"], () => {
    for (const path of Object.values(WORKSPACE_PATHS))
      void router
        .loadRouteChunk(router.routesByPath[path])
        ?.catch(() => undefined);
  });

  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
      month={month}
      account={(placement) => (
        <Account
          placement={placement}
          user={budget.user}
          members={budget.household.members}
        />
      )}
    />
  );
}

function listErrorFor(mutations: BudgetMutations, deleting: boolean) {
  return (
    mutations.restoreTransaction.error ||
    mutations.unsettleSplit.error ||
    (deleting ? "" : mutations.deleteTransaction.error)
  );
}

export function BudgetWorkspace({
  budget,
  month,
  account,
}: {
  budget: BudgetController;
  month: string;
  account: (placement: AccountPlacement) => ReactNode;
}) {
  const queryClient = useQueryClient();
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

  useBrowserSync(["nearby-months", month], () =>
    prefetchNearbyMonths(queryClient, month),
  );

  const alert =
    budget.syncError ||
    search.monthError ||
    listErrorFor(mutations, Boolean(dialogs.deleting));

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
            <MonthFilter
              month={month}
              setMonth={search.setMonth}
              pending={search.monthPending}
              prefetch={(next) => prefetchMonth(queryClient, next)}
            />
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
          <Alert status="fail" className="mb-4">
            <AlertTitle>{alert}</AlertTitle>
          </Alert>
        )}
        <Outlet />
      </WorkspaceShell>
    </WorkspaceContext>
  );
}

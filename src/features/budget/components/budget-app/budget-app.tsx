import { useHydrated } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { UserButton } from "@clerk/tanstack-react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useBudget,
  type BudgetController,
} from "@/features/budget/hooks/use-budget";
import {
  useBudgetMutations,
  type BudgetMutations,
} from "@/features/budget/hooks/use-budget-mutations";
import { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import { useWorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import { useWorkspaceData } from "@/features/budget/hooks/use-workspace-data";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import {
  currentMonth,
  money,
  shiftMonth,
} from "@/features/budget/domain/format";
import { monthSchema } from "@/features/budget/domain/schemas";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { NoticeToast, useNotice } from "@/features/budget/components/notice";
import { AccountsScreen } from "@/features/budget/components/screens/accounts-screen";
import { BudgetScreen } from "@/features/budget/components/screens/budget-screen";
import { OverviewScreen } from "@/features/budget/components/screens/overview-screen";
import type { ScreenProps } from "@/features/budget/components/screens/screen-props";
import { TransactionsScreen } from "@/features/budget/components/screens/transactions-screen";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell";
import styles from "@/features/budget/components/budget-app/budget-app.module.css";
import { Button } from "@/components/ui/button";

export function BudgetApp() {
  const budget = useBudget();

  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
      account={<UserButton />}
    />
  );
}

function MonthNavigator({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (month: string) => void;
}) {
  const today = useHydrated() ? currentMonth() : null;

  return (
    <div className={styles.monthRow}>
      <div className={styles.monthPicker}>
        <Button
          variant="icon"
          className={styles.monthIcon}
          aria-label="Mês anterior"
          disabled={!month}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft size={17} />
        </Button>
        <input
          className={styles.monthInput}
          type="month"
          aria-label="Selecionar mês e ano"
          value={month}
          required
          onChange={(event) => {
            const next = event.currentTarget.value;

            if (monthSchema.safeParse(next).success) setMonth(next);
          }}
        />
        <Button
          variant="icon"
          className={styles.monthIcon}
          aria-label="Próximo mês"
          disabled={!month}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight size={17} />
        </Button>
      </div>
      {today && month !== today && (
        <button className={styles.todayButton} onClick={() => setMonth(today)}>
          Voltar para este mês
        </button>
      )}
    </div>
  );
}

function Screen(props: ScreenProps) {
  switch (props.search.view) {
    case "transactions":
      return <TransactionsScreen {...props} />;
    case "accounts":
      return <AccountsScreen {...props} />;
    case "goals":
      return <BudgetScreen {...props} />;
    default:
      return <OverviewScreen {...props} />;
  }
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
  const search = useBudgetSearch();
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
    setView: search.setView,
  });

  const memberCount = budget.household.members.length;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;

  const alert =
    budget.syncError || listErrorFor(mutations, Boolean(dialogs.deleting));

  const displayMoney = (value: number) => (hidden ? "R$ ••••" : money(value));

  return (
    <WorkspaceShell
      view={search.view}
      members={budget.household.members}
      memberLabel={memberLabel}
      hidden={hidden}
      onToggleHidden={() => setHidden(!hidden)}
      account={account}
      onRegister={actions.openRegister}
      controls={
        <>
          <MonthNavigator month={month} setMonth={search.setMonth} />
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
            summary={data.summary}
            plans={data.plans}
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
      <Screen
        budget={budget}
        search={search}
        data={data}
        month={month}
        busy={mutations.busy}
        hidden={hidden}
        displayMoney={displayMoney}
        dialogs={dialogs}
        actions={actions}
      />
    </WorkspaceShell>
  );
}

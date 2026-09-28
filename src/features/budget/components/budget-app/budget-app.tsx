import { useHydrated } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { UserButton } from "@clerk/tanstack-react-start";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  useBudget,
  type BudgetController,
} from "@/features/budget/hooks/use-budget";
import {
  useBudgetMutations,
  type BudgetMutations,
} from "@/features/budget/hooks/use-budget-mutations";
import { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import {
  useWorkspaceActions,
  type WorkspaceActions,
} from "@/features/budget/hooks/use-workspace-actions";
import {
  useWorkspaceData,
  type WorkspaceData,
} from "@/features/budget/hooks/use-workspace-data";
import {
  useWorkspaceDialogs,
  type WorkspaceDialogs,
} from "@/features/budget/hooks/use-workspace-dialogs";
import {
  currentMonth,
  money,
  shiftMonth,
} from "@/features/budget/domain/format";
import { monthSchema } from "@/features/budget/domain/schemas";
import type { View } from "@/features/budget/domain/types";
import { WORKSPACE_TITLES } from "@/features/budget/constants";
import { AccountList } from "@/features/budget/components/account-list";
import { GoalsSection } from "@/features/budget/components/goals-section/goals-section";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { NoticeToast, useNotice } from "@/features/budget/components/notice";
import { Overview } from "@/features/budget/components/overview/overview";
import { SplitDebtCard } from "@/features/budget/components/split-debt-card";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { TransactionList } from "@/features/budget/components/transaction-list/transaction-list";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell/workspace-shell";
import styles from "@/features/budget/components/budget-app/budget-app.module.css";
import { Button } from "@/components/ui/button";

type BudgetSearchState = ReturnType<typeof useBudgetSearch>;

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

const FILTER_EXPLANATIONS = {
  accounts: {
    all: "O saldo de cada conta inclui as transações de todo o casal.",
    member:
      "O saldo de cada conta considera só as transações da pessoa selecionada.",
  },
  budget: {
    all: "O planejado soma as metas individuais de cada pessoa.",
    member: "Renda, gastos e metas da pessoa selecionada.",
  },
};

function filterExplanation(view: View, memberFilter: string) {
  const texts =
    view === "accounts"
      ? FILTER_EXPLANATIONS.accounts
      : FILTER_EXPLANATIONS.budget;

  return memberFilter === "all" ? texts.all : texts.member;
}

function WorkspaceHeading({
  view,
  busy,
  onAdd,
}: {
  view: View;
  busy: boolean;
  onAdd: () => void;
}) {
  return (
    <div className={styles.pageHeading}>
      <div>
        <h1>{WORKSPACE_TITLES[view].title}</h1>
        <p>{WORKSPACE_TITLES[view].subtitle}</p>
      </div>
      <Button className={styles.addTransaction} disabled={busy} onClick={onAdd}>
        <Plus size={19} />{" "}
        {view === "accounts" ? "Nova conta" : "Nova transação"}
      </Button>
    </div>
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

type ViewProps = {
  budget: BudgetController;
  search: BudgetSearchState;
  data: WorkspaceData;
  month: string;
  busy: boolean;
  hidden: boolean;
  displayMoney: (value: number) => string;
  dialogs: WorkspaceDialogs;
  actions: WorkspaceActions;
};

function BudgetViews({
  budget,
  search,
  data,
  month,
  busy,
  hidden,
  displayMoney,
  dialogs,
  actions,
}: ViewProps) {
  const { view, memberFilter } = search;
  const members = budget.household.members;
  const ownMember = members.find((member) => member.id === budget.user.id);

  return (
    <>
      {view === "overview" && (
        <Overview
          monthly={data.monthly}
          historyTransactions={data.historyTransactions}
          month={month}
          memberFilter={memberFilter}
          hidden={hidden}
          displayMoney={displayMoney}
          summary={data.summary}
          debtCard={
            data.partner && (
              <SplitDebtCard
                net={data.debt.net}
                unpaid={data.debt.unpaid}
                userId={budget.user.id}
                partner={data.partner}
                busy={busy}
                displayMoney={displayMoney}
                onSettle={actions.openSettle}
              />
            )
          }
        />
      )}
      {(view === "overview" || view === "goals") && (
        <GoalsSection
          view={view}
          summary={data.summary}
          plans={data.plans}
          hidden={hidden}
          displayMoney={displayMoney}
          memberFilter={memberFilter}
          userId={budget.user.id}
          busy={busy}
          onEditPercentages={() =>
            dialogs.setPercentagesRevision(ownMember?.percentagesRevision ?? 0)
          }
          onFilterGoal={search.filterGoal}
        />
      )}
      {(view === "overview" || view === "transactions") && (
        <TransactionList
          transactions={data.monthly}
          members={members}
          accounts={budget.state.accounts}
          userId={budget.user.id}
          busy={busy}
          hidden={hidden}
          filters={search}
          onEdit={(transaction) => actions.openTransaction(transaction)}
          onDelete={(transaction) => void actions.remove(transaction)}
          onAdd={() => actions.openTransaction(null)}
          compact={view === "overview"}
          onViewAll={() => search.setView("transactions")}
        />
      )}
    </>
  );
}

function WorkspaceViews(props: ViewProps) {
  const { budget, search, busy, hidden, dialogs, actions } = props;

  if (search.view !== "accounts") return <BudgetViews {...props} />;

  return (
    <AccountList
      accounts={budget.state.accounts}
      transactions={budget.state.transactions}
      memberFilter={search.memberFilter}
      busy={busy}
      hidden={hidden}
      onAdd={() => dialogs.setAccount({ account: null })}
      onEdit={(account) => dialogs.setAccount({ account })}
      onDelete={(account) => void actions.removeAccount(account)}
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

  const { view } = search;
  const memberCount = budget.household.members.length;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;

  const alert =
    budget.syncError || listErrorFor(mutations, Boolean(dialogs.deleting));

  const displayMoney = (value: number) => (hidden ? "R$ ••••" : money(value));

  return (
    <WorkspaceShell
      view={view}
      memberLabel={memberLabel}
      hidden={hidden}
      onToggleHidden={() => setHidden(!hidden)}
      account={account}
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
      <WorkspaceHeading
        view={view}
        busy={mutations.busy}
        onAdd={() =>
          view === "accounts"
            ? dialogs.setAccount({ account: null })
            : actions.openTransaction(null)
        }
      />
      {view !== "accounts" && (
        <MonthNavigator month={month} setMonth={search.setMonth} />
      )}
      <div className={styles.coupleToolbar}>
        <MemberFilter
          members={budget.household.members}
          userId={budget.user.id}
          value={search.memberFilter}
          onChange={search.setMemberFilter}
        />
      </div>
      <p className={styles.filterExplanation}>
        {filterExplanation(view, search.memberFilter)}
      </p>
      {alert && (
        <div role="alert" className={styles.storageError}>
          {alert}
        </div>
      )}
      <WorkspaceViews
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

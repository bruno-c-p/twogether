import { BalanceCard } from "@/features/budget/components/balance-card";
import { BudgetCard } from "@/features/budget/components/budget-card";
import { LatestTransactionsCard } from "@/features/budget/components/latest-transactions-card";
import { PhraseBar } from "@/features/budget/components/phrase-bar";
import { SplitDebtCard } from "@/features/budget/components/split-debt-card";
import type { ScreenProps } from "@/features/budget/components/screens/screen-props";
import { cx } from "@/lib/cx";

export function OverviewScreen({
  budget,
  search,
  data,
  month,
  busy,
  displayMoney,
  hidden,
  dialogs,
  actions,
}: ScreenProps) {
  const ownMember = budget.household.members.find(
    (member) => member.id === budget.user.id,
  );

  return (
    <>
      <h1 className="sr-only">Visão geral</h1>
      <PhraseBar
        accounts={budget.state.accounts}
        disabled={busy}
        onParsed={(draft) => actions.openTransaction(null, draft)}
      />
      <div className="grid grid-cols-2 gap-[20px] items-stretch max-bp1000:grid-cols-1 max-bp620:gap-[12px]">
        <BalanceCard
          summary={data.summary}
          month={month}
          memberFilter={search.memberFilter}
          displayMoney={displayMoney}
          className={cx(!data.partner && "col-span-2 max-bp1000:col-span-1")}
        />
        {data.partner && (
          <SplitDebtCard
            net={data.debt.net}
            unpaid={data.debt.unpaid}
            userId={budget.user.id}
            partner={data.partner}
            busy={busy}
            displayMoney={displayMoney}
            onSettle={actions.openSettle}
          />
        )}
        <BudgetCard
          summary={data.summary}
          plans={data.plans}
          hidden={hidden}
          displayMoney={displayMoney}
          canEdit={
            search.memberFilter === "all" ||
            search.memberFilter === budget.user.id
          }
          busy={busy}
          onEditPercentages={() =>
            dialogs.setPercentagesRevision(ownMember?.percentagesRevision ?? 0)
          }
          onFilterGoal={search.filterGoal}
        />
        <LatestTransactionsCard
          transactions={data.monthly}
          displayMoney={displayMoney}
          onEdit={actions.openTransaction}
          onViewAll={() => search.setView("transactions")}
        />
      </div>
    </>
  );
}

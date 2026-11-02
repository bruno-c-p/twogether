import { BalanceCard } from "@/features/budget/components/balance-card";
import { HouseholdBillsCard } from "@/features/budget/components/household-bills-card";
import { LatestTransactionsCard } from "@/features/budget/components/latest-transactions-card";
import { MonthTotalsCard } from "@/features/budget/components/month-totals-card";
import { SplitDebtCard } from "@/features/budget/components/split-debt-card";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";

export function OverviewScreen() {
  const {
    budget,
    data,
    month,
    busy,
    displayMoney,
    hidden,
    onToggleHidden,
    actions,
    memberFilter,
  } = useWorkspace();

  return (
    <>
      <h1 className="sr-only">Visão geral</h1>
      <div className="grid grid-cols-2 gap-5 items-stretch max-lg:grid-cols-1 max-sm:gap-3">
        <div className="col-span-2 grid grid-cols-5 gap-5 max-xl:grid-cols-2 max-lg:col-span-1 max-lg:grid-cols-1 max-sm:gap-3">
          <BalanceCard
            className="col-span-3 max-xl:col-span-1"
            summary={data.summary}
            month={month}
            memberFilter={memberFilter}
            displayMoney={displayMoney}
            hidden={hidden}
            onToggleHidden={onToggleHidden}
          />
          <div className="col-span-2 flex flex-col gap-5 min-w-0 max-xl:col-span-1 max-sm:gap-3">
            <MonthTotalsCard
              summary={data.summary}
              partners={data.partners}
              displayMoney={displayMoney}
              className="flex-1"
            />
            {data.partner && (
              <SplitDebtCard
                debt={data.debt}
                userId={budget.user.id}
                partner={data.partner}
                busy={busy}
                displayMoney={displayMoney}
                onSettle={actions.openSettle}
              />
            )}
          </div>
        </div>
        <HouseholdBillsCard
          transactions={data.monthly}
          memberFilter={memberFilter}
          hidden={hidden}
          displayMoney={displayMoney}
        />
        <LatestTransactionsCard
          transactions={data.monthly}
          displayMoney={displayMoney}
          onEdit={actions.openTransaction}
        />
      </div>
    </>
  );
}

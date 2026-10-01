import { BalanceCard } from "@/features/budget/components/balance-card";
import { BudgetCard } from "@/features/budget/components/budget-card";
import { LatestTransactionsCard } from "@/features/budget/components/latest-transactions-card";
import { PhraseBar } from "@/features/budget/components/phrase-bar";
import { SplitDebtCard } from "@/features/budget/components/split-debt-card";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { cx } from "@/lib/cx";

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
      <PhraseBar
        accounts={budget.state.accounts}
        disabled={busy}
        onParsed={(draft) => actions.openTransaction(null, draft)}
      />
      <div className="grid grid-cols-2 gap-[20px] items-stretch max-bp1000:grid-cols-1 max-bp620:gap-[12px]">
        <BalanceCard
          summary={data.summary}
          month={month}
          memberFilter={memberFilter}
          displayMoney={displayMoney}
          hidden={hidden}
          onToggleHidden={onToggleHidden}
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
          canEdit={data.canEditPercentages}
          busy={busy}
          onEditPercentages={actions.openPercentages}
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

import { Link } from "@tanstack/react-router";
import Big from "big.js";
import { OverviewCard } from "@/features/budget/components/overview-card";
import { GOALS } from "@/features/budget/constants";
import { partnerShare } from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import { percentOf, sum } from "@/lib/decimal";

function percentLabel(amount: number, total: number) {
  return `${new Big(percentOf(amount, total)).round(0, Big.roundHalfUp).toNumber()}%`;
}

export function HouseholdBillsCard({
  transactions,
  hidden,
  displayMoney,
}: {
  transactions: Transaction[];
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const bills = transactions.filter(
    (transaction) => transaction.kind === "expense" && transaction.split,
  );

  const total = sum(bills.map((bill) => bill.amount));
  const share = sum(bills.map((bill) => partnerShare(bill.amount)));

  const goals = GOALS.map((goal) => {
    const own = bills.filter((bill) => bill.goal === goal.id);

    return {
      ...goal,
      amount: sum(own.map((bill) => bill.amount)),
      share: sum(own.map((bill) => partnerShare(bill.amount))),
    };
  }).filter((goal) => goal.amount > 0);

  return (
    <OverviewCard aria-labelledby="bills-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="bills-title"
          className="m-0 font-heading text-lg font-700 tracking-[-0.02em]"
        >
          Contas da casa
        </h2>
        {/* Month and person carry over through retainSearchParams. */}
        <Link
          to="/transacoes"
          search={{ kind: "split" }}
          className="inline-flex items-center gap-2 py-2 text-sm text-text"
        >
          Ver contas →
        </Link>
      </div>
      {goals.length ? (
        <>
          <p className="m-0 mb-4 text-sm text-text-muted tabular-nums">
            {displayMoney(total)} no mês · {displayMoney(share)} para cada
          </p>
          <div
            className="flex h-[14px] rounded-full overflow-clip bg-surface-soft gap-0.5 mb-5"
            role="img"
            aria-label={
              hidden
                ? "Divisão por meta oculta"
                : goals
                    .map(
                      (goal) =>
                        `${goal.name} ${percentLabel(goal.amount, total)}`,
                    )
                    .join(", ")
            }
          >
            {!hidden &&
              goals.map((goal) => (
                <span
                  key={goal.id}
                  className="block h-full"
                  title={`${goal.name}: ${displayMoney(goal.amount)}`}
                  style={{
                    background: goal.color,
                    width: `${percentOf(goal.amount, total)}%`,
                  }}
                />
              ))}
          </div>
          <ul className="list-none m-0 p-0 flex flex-col gap-3">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link
                  to="/transacoes"
                  search={{ kind: "split", goal: goal.id }}
                  className="flex items-center gap-3 text-md text-text"
                  aria-label={`${goal.name}: ${displayMoney(goal.amount)}, ${displayMoney(goal.share)} para cada`}
                >
                  <span
                    className="size-[8px] rounded-full shrink-0"
                    style={{ background: goal.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{goal.name}</span>
                  {!hidden && (
                    <span className="text-xs text-text-muted tabular-nums">
                      {percentLabel(goal.amount, total)}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-right">
                    <strong className="block font-600 tabular-nums">
                      {displayMoney(goal.amount)}
                    </strong>
                    <span className="block text-xs text-text-muted tabular-nums">
                      {displayMoney(goal.share)} cada
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-text-muted m-0 py-3">
          Nenhuma conta dividida neste mês.
        </p>
      )}
    </OverviewCard>
  );
}

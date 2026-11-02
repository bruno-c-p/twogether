import { Link } from "@tanstack/react-router";
import Big from "big.js";
import { ArrowRight, Icon } from "@/components/glaze/icon";
import { buttonVariants } from "@/components/glaze/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@/components/glaze/ui/empty-state";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/glaze/ui/item";
import { GOALS } from "@/features/budget/constants";
import { partnerShare } from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import { percentOf, sum } from "@/lib/decimal";

function percentLabel(amount: number, total: number) {
  return `${new Big(percentOf(amount, total)).round(0, Big.roundHalfUp).toNumber()}%`;
}

export function HouseholdBillsCard({
  transactions,
  memberFilter,
  hidden,
  displayMoney,
}: {
  transactions: Transaction[];
  memberFilter: string;
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  const bills = transactions.filter(
    (transaction) => transaction.kind === "expense" && transaction.split,
  );

  // One person's view holds only the bills they paid, so there is no "each".
  const shared = memberFilter === "all";
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
    <Card role="region" aria-labelledby="bills-title">
      <CardHeader>
        <CardTitle>
          <h2 id="bills-title">Contas da casa</h2>
        </CardTitle>
        {goals.length > 0 && (
          <CardDescription className="tabular-nums">
            {displayMoney(total)} no mês
            {shared && ` · ${displayMoney(share)} para cada`}
          </CardDescription>
        )}
        <CardAction>
          {/* Month and person carry over through retainSearchParams. */}
          <Link
            to="/transacoes"
            search={{ kind: "split" }}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Ver contas
            <Icon icon={ArrowRight} />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent flush>
        {goals.length ? (
          <ItemGroup variant="plain" aria-label="Contas por meta">
            {goals.map((goal) => (
              <Item key={goal.id}>
                <ItemContent>
                  <ItemTitle>
                    <Link
                      to="/transacoes"
                      search={{ kind: "split", goal: goal.id }}
                      data-slot="item-link"
                      data-control=""
                      className="min-w-0 truncate after:absolute after:inset-0 after:content-['']"
                      aria-label={`${goal.name}: ${displayMoney(goal.amount)}${shared ? `, ${displayMoney(goal.share)} para cada` : ""}`}
                    >
                      {goal.name}
                    </Link>
                    {!hidden && (
                      <span className="shrink-0 type-caption text-text-2 tabular-nums">
                        {percentLabel(goal.amount, total)}
                      </span>
                    )}
                  </ItemTitle>
                </ItemContent>
                <span className="shrink-0 text-end">
                  <span className="block type-label tabular-nums">
                    {displayMoney(goal.amount)}
                  </span>
                  {shared && (
                    <span className="block type-caption text-text-2 tabular-nums">
                      {displayMoney(goal.share)} cada
                    </span>
                  )}
                </span>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <Empty variant="plain" size="sm">
            <EmptyHeader>
              <EmptyTitle icon={false}>
                Nenhuma conta dividida neste mês.
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

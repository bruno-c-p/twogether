import { Link } from "@tanstack/react-router";
import { ArrowRight, Edit, Icon } from "@/components/glaze/icon";
import { Button, buttonVariants } from "@/components/glaze/ui/button";
import {
  Card,
  CardAction,
  CardContent,
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
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/glaze/ui/item";
import { AMOUNT_STYLE } from "@/features/budget/components/amount-style";
import { GOALS, KINDS } from "@/features/budget/constants";
import { shortDay } from "@/features/budget/domain/format";
import type {
  Transaction,
  TransactionKind,
} from "@/features/budget/domain/types";

const LATEST_COUNT = 5;

// An expense shows its goal instead.
const LABELS = {
  income: "Entrada",
  transfer: KINDS.transfer.label,
} satisfies Record<Exclude<TransactionKind, "expense">, string>;

export function LatestTransactionsCard({
  transactions,
  displayMoney,
  onEdit,
}: {
  transactions: Transaction[];
  displayMoney: (value: number) => string;
  onEdit: (transaction: Transaction) => void;
}) {
  const latest = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LATEST_COUNT);

  return (
    <Card
      role="region"
      aria-labelledby="latest-title"
      className="max-lg:hidden"
    >
      <CardHeader>
        <CardTitle>
          <h2 id="latest-title">Últimas transações</h2>
        </CardTitle>
        <CardAction>
          {/* Month and person carry over through retainSearchParams. */}
          <Link
            to="/transacoes"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Ver todas
            <Icon icon={ArrowRight} />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent flush>
        {latest.length ? (
          <ItemGroup variant="plain" aria-label="Últimas transações">
            {latest.map((transaction) => {
              const goal = GOALS.find((item) => item.id === transaction.goal);
              const amount = AMOUNT_STYLE[transaction.kind];

              return (
                <Item key={transaction.id}>
                  <ItemContent>
                    <ItemTitle>
                      <span>{transaction.description}</span>
                    </ItemTitle>
                    <ItemDescription className="truncate">
                      {transaction.kind === "expense"
                        ? (goal?.name ?? "Sem meta")
                        : LABELS[transaction.kind]}
                      {" · "}
                      {shortDay(transaction.date)}
                    </ItemDescription>
                  </ItemContent>
                  <span className="shrink-0 type-label tabular-nums">
                    {amount.sign}
                    {displayMoney(transaction.amount)}
                  </span>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${transaction.description}`}
                      onClick={() => onEdit(transaction)}
                    >
                      <Icon icon={Edit} />
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        ) : (
          <Empty variant="plain" size="sm">
            <EmptyHeader>
              <EmptyTitle icon={false}>Nenhuma transação neste mês.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

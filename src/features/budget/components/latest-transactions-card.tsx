import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import { OverviewCard } from "@/features/budget/components/overview-card";
import { GOALS } from "@/features/budget/constants";
import { shortDay } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

const LATEST_COUNT = 5;

function Tile({ transaction }: { transaction: Transaction }) {
  const goal = GOALS.find((item) => item.id === transaction.goal);
  const income = transaction.kind === "income";

  return (
    <span
      className={cx(
        "size-[40px] rounded-md grid place-items-center shrink-0",
        income && "bg-surface-soft text-green",
      )}
      style={
        !income && goal
          ? { background: goal.background, color: goal.color }
          : undefined
      }
      aria-hidden="true"
    >
      {income && <ArrowDownLeft size={18} />}
      {!income && goal && <GoalIcon goal={goal.id} size={18} />}
      {!income && !goal && <ArrowUpRight size={18} />}
    </span>
  );
}

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
    <OverviewCard aria-labelledby="latest-title" className="max-bp1000:hidden">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2
          id="latest-title"
          className="m-0 font-heading text-lg font-700 tracking-[-0.02em]"
        >
          Últimas transações
        </h2>
        {/* Month and person carry over through retainSearchParams. */}
        <Link
          to="/transacoes"
          className="inline-flex items-center gap-2 py-2 text-sm text-text"
        >
          Ver todas →
        </Link>
      </div>
      {latest.length ? (
        <ul className="list-none m-0 p-0 flex flex-col">
          {latest.map((transaction) => {
            const goal = GOALS.find((item) => item.id === transaction.goal);
            const income = transaction.kind === "income";

            return (
              <li key={transaction.id}>
                <Button
                  variant="unstyled"
                  type="button"
                  className="flex w-full items-center gap-4 py-2 p-0 border-0 bg-transparent text-left text-text cursor-pointer"
                  aria-label={`Editar ${transaction.description}`}
                  onClick={() => onEdit(transaction)}
                >
                  <Tile transaction={transaction} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-md truncate">
                      {transaction.description}
                    </span>
                    <span className="block text-xs text-text-muted truncate">
                      {income ? "Entrada" : (goal?.name ?? "Sem meta")}
                      {" · "}
                      {shortDay(transaction.date)}
                    </span>
                  </span>
                  <span className="text-md font-600 tabular-nums shrink-0">
                    {income ? "+" : "–"} {displayMoney(transaction.amount)}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-muted m-0 py-3">
          Nenhuma transação neste mês.
        </p>
      )}
    </OverviewCard>
  );
}

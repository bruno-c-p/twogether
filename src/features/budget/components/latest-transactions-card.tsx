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
        "size-[40px] rounded-[10px] grid place-items-center shrink-0",
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
      <div className="flex items-center justify-between gap-[12px] mb-[10px]">
        <h2 id="latest-title" className="m-0 font-heading text-[19px] font-500">
          Últimas transações
        </h2>
        {/* Month and person carry over through retainSearchParams. */}
        <Link
          to="/transacoes"
          className="inline-flex items-center gap-[7px] py-[8px] text-[13px] text-text"
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
                <button
                  type="button"
                  className="flex w-full items-center gap-[14px] py-[10px] p-0 border-0 bg-transparent text-left text-text cursor-pointer"
                  aria-label={`Editar ${transaction.description}`}
                  onClick={() => onEdit(transaction)}
                >
                  <Tile transaction={transaction} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] truncate">
                      {transaction.description}
                    </span>
                    <span className="block text-[12px] text-text-muted truncate">
                      {income ? "Entrada" : (goal?.name ?? "Sem meta")}
                      {" · "}
                      {shortDay(transaction.date)}
                    </span>
                  </span>
                  <span className="text-[14px] font-600 tabular-nums shrink-0">
                    {income ? "+" : "–"} {displayMoney(transaction.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-text-muted m-0 py-[12px]">
          Nenhuma transação neste mês.
        </p>
      )}
    </OverviewCard>
  );
}

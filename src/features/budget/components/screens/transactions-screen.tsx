import { Plus } from "lucide-react";
import { monthName } from "@/features/budget/domain/format";
import { PageHeading } from "@/features/budget/components/page-heading";
import {
  TransactionList,
  TransactionSearch,
} from "@/features/budget/components/transaction-list/transaction-list";
import { useTransactionFilters } from "@/features/budget/hooks/use-transaction-filters";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { Button } from "@/components/ui/button";

function countNote(count: number, month: string) {
  const noun = count === 1 ? "transação" : "transações";

  return `${count.toLocaleString("pt-BR")} ${noun} em ${monthName(month)}`;
}

export function TransactionsScreen() {
  const { budget, data, month, busy, hidden, actions } = useWorkspace();
  const filters = useTransactionFilters();

  return (
    <>
      <PageHeading
        title="Transações"
        note={countNote(data.monthly.length, month)}
        action={
          <div className="flex items-center gap-3 flex-wrap max-bp620:w-full">
            <TransactionSearch
              query={filters.query}
              setQuery={filters.setQuery}
            />
            <Button
              disabled={busy}
              onClick={() => actions.openTransaction(null)}
            >
              <Plus size={19} /> Adicionar transação
            </Button>
          </div>
        }
      />
      <TransactionList
        transactions={data.monthly}
        members={budget.household.members}
        userId={budget.user.id}
        busy={busy}
        hidden={hidden}
        filters={filters}
        onEdit={(transaction) => actions.openTransaction(transaction)}
        onDelete={(transaction) => void actions.remove(transaction)}
        onAdd={() => actions.openTransaction(null)}
      />
    </>
  );
}

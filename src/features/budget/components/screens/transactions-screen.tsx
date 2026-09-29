import { Plus } from "lucide-react";
import { PageHeading } from "@/features/budget/components/page-heading";
import { PhraseBar } from "@/features/budget/components/phrase-bar";
import {
  TransactionList,
  TransactionSearch,
} from "@/features/budget/components/transaction-list/transaction-list";
import type { ScreenProps } from "@/features/budget/components/screens/screen-props";
import { Button } from "@/components/ui/button";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function countNote(count: number, month: string) {
  const [year, number] = month.split("-").map(Number);
  const name = monthFormatter.format(new Date(year, number - 1, 1));

  return `${count} ${count === 1 ? "transação" : "transações"} em ${name}`;
}

export function TransactionsScreen({
  budget,
  search,
  data,
  month,
  busy,
  hidden,
  actions,
}: ScreenProps) {
  return (
    <>
      <PageHeading
        title="Transações"
        note={countNote(data.monthly.length, month)}
        action={
          <div className="flex items-center gap-[12px] flex-wrap max-bp620:w-full">
            <TransactionSearch
              query={search.query}
              setQuery={search.setQuery}
            />
            <Button
              disabled={busy}
              onClick={() => actions.openTransaction(null)}
            >
              <Plus size={19} /> Nova transação
            </Button>
          </div>
        }
      />
      <PhraseBar
        accounts={budget.state.accounts}
        disabled={busy}
        onParsed={(draft) => actions.openTransaction(null, draft)}
      />
      <TransactionList
        transactions={data.monthly}
        members={budget.household.members}
        accounts={budget.state.accounts}
        userId={budget.user.id}
        busy={busy}
        hidden={hidden}
        filters={search}
        onEdit={(transaction) => actions.openTransaction(transaction)}
        onDelete={(transaction) => void actions.remove(transaction)}
        onAdd={() => actions.openTransaction(null)}
      />
    </>
  );
}

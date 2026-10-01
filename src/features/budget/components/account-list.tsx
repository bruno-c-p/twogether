import { Landmark, Plus } from "lucide-react";
import {
  accountBalance,
  accountMonthActivity,
} from "@/features/budget/domain/calc";
import { monthName } from "@/features/budget/domain/format";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { AccountRow } from "@/features/budget/components/account-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/budget/components/empty-state";

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  memberFilter: string;
  month: string;
  busy: boolean;
  displayMoney: (value: number) => string;
  onAdd: () => void;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function AccountList({
  accounts,
  transactions,
  memberFilter,
  month,
  busy,
  displayMoney,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  if (!accounts.length) {
    return (
      <EmptyState
        icon={<Landmark size={25} strokeWidth={1.5} />}
        title="Nenhuma conta cadastrada."
        action={
          <Button className="mt-[8px]" onClick={onAdd}>
            <Plus size={18} /> Adicionar primeira conta
          </Button>
        }
      >
        Cadastre uma conta para lançar receitas e despesas.
      </EmptyState>
    );
  }

  const visibleTransactions =
    memberFilter === "all"
      ? transactions
      : transactions.filter(
          (transaction) => transaction.memberId === memberFilter,
        );

  const sorted = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  const balances = sorted.map((account) =>
    accountBalance(account, visibleTransactions),
  );

  const total = balances.reduce((sum, balance) => sum + balance, 0);

  return (
    <>
      <section
        aria-labelledby="accounts-total"
        className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[4px] px-[24px] py-[22px] max-bp620:px-[18px] mb-[24px] bg-surface border border-solid border-border rounded-[18px]"
      >
        <h2
          id="accounts-total"
          className="text-[15px] font-400 font-sans text-text-muted"
        >
          Total nas contas
        </h2>
        <p className="text-[34px] max-bp620:text-[28px] font-600 tracking-[-0.03em] tabular-nums text-green">
          {displayMoney(total)}
        </p>
      </section>
      <ul className="grid grid-cols-2 max-bp800:grid-cols-1 gap-[24px] m-0 p-0">
        {sorted.map((account, index) => {
          const activity = accountMonthActivity(
            account,
            visibleTransactions,
            month,
          );

          return (
            <AccountRow
              key={account.id}
              account={account}
              used={transactions.some(
                (transaction) => transaction.accountId === account.id,
              )}
              balance={balances[index]}
              entered={activity.entered}
              left={activity.left}
              monthTransactions={activity.transactions}
              monthName={monthName(month)}
              busy={busy}
              displayMoney={displayMoney}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </ul>
    </>
  );
}

import { Landmark, Plus } from "lucide-react";
import { accountBalance } from "@/features/budget/domain/calc";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { AccountRow } from "@/features/budget/components/account-row";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/features/budget/components/empty-state/empty-state";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  memberFilter: string;
  busy: boolean;
  hidden: boolean;
  onAdd: () => void;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function AccountList({
  accounts,
  transactions,
  memberFilter,
  busy,
  hidden,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const visibleTransactions =
    memberFilter === "all"
      ? transactions
      : transactions.filter(
          (transaction) => transaction.memberId === memberFilter,
        );
  const sorted = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  return (
    <Panel aria-labelledby="accounts-title">
      <SectionHeading
        title="Contas cadastradas"
        titleId="accounts-title"
        count={accounts.length}
        description="Saldo inicial mais receitas, menos despesas de cada conta."
      />
      {sorted.length ? (
        <div>
          {sorted.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              used={transactions.some(
                (transaction) => transaction.accountId === account.id,
              )}
              balance={accountBalance(account, visibleTransactions)}
              busy={busy}
              hidden={hidden}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Landmark size={25} strokeWidth={1.5} />}
          title="Nenhuma conta cadastrada."
          action={
            <Button onClick={onAdd}>
              <Plus size={18} /> Adicionar primeira conta
            </Button>
          }
        >
          Cadastre uma conta para lançar receitas e despesas.
        </EmptyState>
      )}
    </Panel>
  );
}

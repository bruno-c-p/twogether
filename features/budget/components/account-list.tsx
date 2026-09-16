import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { accountBalance, money } from "@/features/budget/services/budget";
import type { BankAccount, Transaction } from "@/features/budget/types";
import { Button } from "@/src/ui/button";
import { EmptyState } from "@/src/ui/empty-state";
import {
  ListRow,
  ListRowActions,
  ListRowIcon,
  ListRowMeta,
  ListRowName,
  ListRowValue,
  listRowAction,
  listRowDelete,
} from "@/src/ui/list-row";
import { Panel, SectionHeading } from "@/src/ui/panel";

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
          {sorted.map((account) => {
            const used = transactions.some(
              (transaction) => transaction.accountId === account.id,
            );
            const balance = accountBalance(account, visibleTransactions);
            return (
              <ListRow key={account.id}>
                <ListRowIcon>
                  <Landmark size={18} />
                </ListRowIcon>
                <div>
                  <ListRowName
                    disabled={busy}
                    onClick={() => onEdit(account)}
                  >
                    {account.name}
                  </ListRowName>
                  <ListRowMeta>
                    {used
                      ? "Em uso nas transações"
                      : "Nenhuma transação nesta conta"}
                  </ListRowMeta>
                </div>
                <ListRowValue tone={balance < 0 ? "negative" : "positive"}>
                  {hidden ? "R$ ••••" : money(balance)}
                </ListRowValue>
                <ListRowActions>
                  <Button
                    variant="icon"
                    className={listRowAction}
                    disabled={busy}
                    aria-label={`Editar ${account.name}`}
                    onClick={() => onEdit(account)}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="icon"
                    className={`${listRowAction} ${listRowDelete}`}
                    disabled={busy || used}
                    title={
                      used
                        ? "Exclua ou mova as transações desta conta antes de apagá-la."
                        : "Excluir conta"
                    }
                    aria-label={`Excluir ${account.name}`}
                    onClick={() => onDelete(account)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </ListRowActions>
              </ListRow>
            );
          })}
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

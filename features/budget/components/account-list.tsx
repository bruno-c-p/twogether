import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { accountBalance, money } from "@/features/budget/services/budget";
import type { BankAccount, Transaction } from "@/features/budget/types";
import ui from "@/src/ui.module.css";
import list from "@/features/budget/styles/list-row.module.css";

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
    <section className={ui.panel} aria-labelledby="accounts-title">
      <div className={ui.sectionHeading}>
        <div>
          <h2 id="accounts-title">
            Contas cadastradas
            <span className={ui.countBadge}>{accounts.length}</span>
          </h2>
          <p>Saldo inicial mais receitas, menos despesas de cada conta.</p>
        </div>
      </div>
      {sorted.length ? (
        <div>
          {sorted.map((account) => {
            const used = transactions.some(
              (transaction) => transaction.accountId === account.id,
            );
            const balance = accountBalance(account, visibleTransactions);
            return (
              <div className={list.row} key={account.id}>
                <span className={list.icon}>
                  <Landmark size={18} />
                </span>
                <div>
                  <button
                    className={list.name}
                    disabled={busy}
                    onClick={() => onEdit(account)}
                  >
                    {account.name}
                  </button>
                  <div className={list.meta}>
                    {used
                      ? "Em uso nas transações"
                      : "Nenhuma transação nesta conta"}
                  </div>
                </div>
                <span
                  className={`${list.value} ${balance < 0 ? list.negative : list.positive}`}
                >
                  {hidden ? "R$ ••••" : money(balance)}
                </span>
                <div className={list.actions}>
                  <button
                    className={`${ui.iconButton} ${list.actionButton}`}
                    disabled={busy}
                    aria-label={`Editar ${account.name}`}
                    onClick={() => onEdit(account)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className={`${ui.iconButton} ${list.actionButton} ${list.deleteButton}`}
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
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={ui.emptyState}>
          <div className={ui.emptyIcon}>
            <Landmark size={25} strokeWidth={1.5} />
          </div>
          <h3>Nenhuma conta cadastrada.</h3>
          <p>Cadastre uma conta para lançar receitas e despesas.</p>
          <button className={ui.primaryButton} onClick={onAdd}>
            <Plus size={18} /> Adicionar primeira conta
          </button>
        </div>
      )}
    </section>
  );
}

import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import type { BankAccount, Transaction } from "../types";

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function AccountList({
  accounts,
  transactions,
  busy,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const sorted = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  return (
    <section className="transactions-panel" aria-labelledby="accounts-title">
      <div className="section-heading">
        <div>
          <h2 id="accounts-title">
            Contas cadastradas
            <span className="count-badge">{accounts.length}</span>
          </h2>
          <p>Cada transação precisa de uma destas contas.</p>
        </div>
      </div>
      {sorted.length ? (
        <div className="account-table">
          {sorted.map((account) => {
            const used = transactions.some(
              (transaction) => transaction.accountId === account.id,
            );
            return (
              <div className="account-item" key={account.id}>
                <span className="transaction-icon income-icon">
                  <Landmark size={18} />
                </span>
                <div>
                  <button
                    className="transaction-name"
                    disabled={busy}
                    onClick={() => onEdit(account)}
                  >
                    {account.name}
                  </button>
                  <div className="transaction-person">
                    {used
                      ? "Em uso nas transações"
                      : "Nenhuma transação nesta conta"}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`Editar ${account.name}`}
                    onClick={() => onEdit(account)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button delete-button"
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
        <div className="empty-state">
          <div className="empty-icon">
            <Landmark size={25} strokeWidth={1.5} />
          </div>
          <h3>Nenhuma conta cadastrada.</h3>
          <p>Cadastre uma conta para lançar receitas e despesas.</p>
          <button className="primary-button" onClick={onAdd}>
            <Plus size={18} /> Adicionar primeira conta
          </button>
        </div>
      )}
    </section>
  );
}

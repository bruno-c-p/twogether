import { useState } from "react";
import { Trash2 } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { DeleteAccountDialog } from "@/features/budget/components/delete-account-dialog/delete-account-dialog";
import { shortDay } from "@/features/budget/domain/format";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";

function activityGoal(transaction: Transaction) {
  return GOALS.find((goal) => goal.id === transaction.goal);
}

function dotColor(transaction: Transaction) {
  return activityGoal(transaction)?.color ?? "var(--green)";
}

export function AccountRow({
  account,
  used,
  balance,
  entered,
  left,
  monthTransactions,
  monthName,
  busy,
  displayMoney,
  onEdit,
  onDelete,
}: {
  account: BankAccount;
  used: boolean;
  balance: number;
  entered: number;
  left: number;
  monthTransactions: Transaction[];
  monthName: string;
  busy: boolean;
  displayMoney: (value: number) => string;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}) {
  const count = monthTransactions.length;
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="list-none min-w-0 flex flex-col gap-5 p-6 max-bp620:p-4 bg-surface border border-solid border-border rounded-lg">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-[180px] flex-1">
          <span className="w-[40px] h-[40px] shrink-0 grid place-items-center rounded-md bg-surface-soft text-green text-md font-700">
            {account.name.charAt(0).toLocaleUpperCase("pt-BR")}
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-600 truncate">{account.name}</h3>
            <p className="text-sm text-text-muted">
              {count === 1 ? "1 transação" : `${count} transações`} em{" "}
              {monthName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="icon"
            className="text-text-muted"
            disabled={busy || used}
            title={
              used
                ? "Exclua ou mova as transações desta conta antes de apagá-la."
                : "Excluir conta"
            }
            aria-label={`Excluir ${account.name}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={15} />
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            aria-label={`Editar ${account.name}`}
            onClick={() => onEdit(account)}
          >
            Editar
          </Button>
        </div>
      </div>
      <p className="text-3xl font-700 tracking-[-0.035em] tabular-nums break-words">
        {displayMoney(balance)}
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-md tabular-nums">
        <div>
          <p className="text-xs text-text-muted">Entrou no mês</p>
          <p className="font-600">+ {displayMoney(entered)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Saiu no mês</p>
          <p className="font-600">- {displayMoney(left)}</p>
        </div>
      </div>
      {count > 0 && (
        <ul className="m-0 p-0 border-t border-t-solid border-t-border">
          {monthTransactions.map((transaction) => (
            <li
              key={transaction.id}
              className="list-none flex items-center gap-2 py-3 border-b border-b-solid border-b-border text-md"
            >
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <span
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ backgroundColor: dotColor(transaction) }}
                />
                {activityGoal(transaction)?.name ?? "Receita"}
              </span>
              <span className="flex-1 min-w-0 truncate">
                {transaction.description}{" "}
                <span className="text-text-muted">
                  · {shortDay(transaction.date)}
                </span>
              </span>
              <span className="font-600 tabular-nums shrink-0">
                {transaction.kind === "income" ? "+" : "-"}{" "}
                {displayMoney(transaction.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {confirming && (
        <DeleteAccountDialog
          account={account}
          busy={busy}
          onClose={() => setConfirming(false)}
          onDelete={() => onDelete(account)}
        />
      )}
    </li>
  );
}

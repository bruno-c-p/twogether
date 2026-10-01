import { Trash2 } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { shortDay } from "@/features/budget/domain/format";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";

function dotColor(transaction: Transaction) {
  if (transaction.kind === "income") return "var(--green)";

  return (
    GOALS.find((goal) => goal.id === transaction.goal)?.color ??
    "var(--text-muted)"
  );
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

  return (
    <li className="list-none min-w-0 flex flex-col gap-[20px] p-[24px] max-bp620:p-[18px] bg-surface border border-solid border-border rounded-[18px]">
      <div className="flex items-start justify-between gap-[12px] flex-wrap">
        <div className="flex items-center gap-[12px] min-w-[180px] flex-1">
          <span className="w-[40px] h-[40px] shrink-0 grid place-items-center rounded-[11px] bg-surface-soft text-green text-[15px] font-700">
            {account.name.charAt(0).toLocaleUpperCase("pt-BR")}
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-600 truncate">{account.name}</h3>
            <p className="text-[13px] text-text-muted">
              {count === 1 ? "1 transação" : `${count} transações`} em{" "}
              {monthName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[4px] shrink-0">
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
            onClick={() => onDelete(account)}
          >
            <Trash2 size={15} />
          </Button>
          <Button
            variant="secondary"
            className="bg-transparent text-text-muted text-[13px] px-[10px] py-[6px] rounded-[8px]"
            disabled={busy}
            aria-label={`Editar ${account.name}`}
            onClick={() => onEdit(account)}
          >
            Editar
          </Button>
        </div>
      </div>
      <p className="text-[36px] max-bp620:text-[30px] font-600 tracking-[-0.03em] tabular-nums break-words">
        {displayMoney(balance)}
      </p>
      <div className="flex flex-wrap gap-x-[28px] gap-y-[8px] text-[14px] tabular-nums">
        <div>
          <p className="text-[12px] text-text-muted">Entrou no mês</p>
          <p className="font-600 text-green">+ {displayMoney(entered)}</p>
        </div>
        <div>
          <p className="text-[12px] text-text-muted">Saiu no mês</p>
          <p className="font-600">- {displayMoney(left)}</p>
        </div>
      </div>
      {count > 0 && (
        <ul className="m-0 p-0 border-t border-t-solid border-t-border">
          {monthTransactions.map((transaction) => (
            <li
              key={transaction.id}
              className="list-none flex items-center gap-[10px] py-[11px] border-b border-b-solid border-b-border text-[14px]"
            >
              <span
                className="w-[8px] h-[8px] rounded-full shrink-0"
                style={{ backgroundColor: dotColor(transaction) }}
              />
              <span className="flex-1 min-w-0 truncate">
                {transaction.description}{" "}
                <span className="text-text-muted">
                  · {shortDay(transaction.date)}
                </span>
              </span>
              <span
                className={`font-600 tabular-nums shrink-0 ${transaction.kind === "income" ? "text-green" : ""}`}
              >
                {transaction.kind === "income" ? "+" : "-"}{" "}
                {displayMoney(transaction.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

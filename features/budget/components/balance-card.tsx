import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { money } from "../services/budget";

interface Props {
  balance: number;
  income: number;
  expenses: number;
  filtered: boolean;
  hidden: boolean;
}

export function BalanceCard({
  balance,
  income,
  expenses,
  filtered,
  hidden,
}: Props) {
  const display = (value: number) => (hidden ? "R$ ••••" : money(value));
  return (
    <div className={`balance-card${balance < 0 ? " negative" : ""}`}>
      <div className="balance-top">
        {filtered ? "Saldo desta pessoa" : "Nosso saldo do mês"}
      </div>
      <div className="balance-amount">{display(balance)}</div>
      <div className="balance-caption">
        <span className="balance-dot" />
        {balance < 0
          ? "As despesas superam as entradas neste mês."
          : income
            ? "Saldo = entradas - despesas."
            : "Nenhuma entrada registrada neste mês."}
      </div>
      <div className="balance-divider" />
      <div className="balance-bottom">
        <div>
          <span>
            <span className="money-icon">
              <ArrowDownLeft size={14} />
            </span>{" "}
            Entradas
          </span>
          <strong>{display(income)}</strong>
        </div>
        <div>
          <span>
            <span className="money-icon">
              <ArrowUpRight size={14} />
            </span>{" "}
            Saídas
          </span>
          <strong>{display(expenses)}</strong>
        </div>
        <div className="balance-decoration" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

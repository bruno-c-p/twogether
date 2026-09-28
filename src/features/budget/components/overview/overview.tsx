import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Distribution } from "@/features/budget/components/distribution/distribution";
import { ExpenseCharts } from "@/features/budget/components/expense-charts/expense-charts";
import { FinancialHistory } from "@/features/budget/components/financial-history/financial-history";
import styles from "@/features/budget/components/overview/overview.module.css";
import { OverviewGrid } from "@/components/ui/panel/panel";
import type { Transaction } from "@/features/budget/domain/types";
import { summarize } from "@/features/budget/domain/calc";

export function Overview({
  monthly,
  historyTransactions,
  month,
  memberFilter,
  hidden,
  displayMoney,
  summary,
  debtCard,
}: {
  monthly: Transaction[];
  historyTransactions: Transaction[];
  month: string;
  memberFilter: string;
  hidden: boolean;
  displayMoney: (value: number) => string;
  summary: ReturnType<typeof summarize>;
  debtCard?: ReactNode;
}) {
  return (
    <>
      <OverviewGrid aria-label="Resumo mensal">
        <div
          className={`${styles.balanceCard} ${summary.balance < 0 ? styles.negative : ""}`}
        >
          <div className={styles.balanceTop}>
            {memberFilter === "all"
              ? "Nosso saldo do mês"
              : "Saldo desta pessoa"}
          </div>
          <div className={styles.balanceAmount}>
            {displayMoney(summary.balance)}
          </div>
          <div className={styles.balanceCaption}>
            <span className={styles.balanceDot} />
            {summary.balance < 0
              ? "As despesas superam as entradas neste mês."
              : summary.income
                ? "Saldo = entradas - despesas."
                : "Nenhuma entrada registrada neste mês."}
          </div>
          <div className={styles.balanceDivider} />
          <div className={styles.balanceBottom}>
            <div>
              <span>
                <span className={styles.moneyIcon}>
                  <ArrowDownLeft size={14} />
                </span>{" "}
                Entradas
              </span>
              <strong>{displayMoney(summary.income)}</strong>
            </div>
            <div>
              <span>
                <span className={styles.moneyIcon}>
                  <ArrowUpRight size={14} />
                </span>{" "}
                Saídas
              </span>
              <strong>{displayMoney(summary.expenses)}</strong>
            </div>
            <div className={styles.balanceDecoration} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <Distribution transactions={monthly} hidden={hidden} />
      </OverviewGrid>
      {debtCard}
      {month && (
        <ExpenseCharts
          transactions={monthly}
          month={month}
          hidden={hidden}
        />
      )}
      {month && (
        <FinancialHistory
          transactions={historyTransactions}
          month={month}
          hidden={hidden}
        />
      )}
    </>
  );
}

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TransactionKind } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/kind-toggle/kind-toggle.module.css";

export function KindToggle({
  kind,
  onChange,
}: {
  kind: TransactionKind;
  onChange: (kind: TransactionKind) => void;
}) {
  return (
    <div className={styles.kindToggle} aria-label="Tipo da transação">
      <button
        type="button"
        className={kind === "expense" ? styles.active : ""}
        aria-pressed={kind === "expense"}
        onClick={() => onChange("expense")}
      >
        <ArrowUpRight size={17} /> Despesa
      </button>
      <button
        type="button"
        className={kind === "income" ? styles.active : ""}
        aria-pressed={kind === "income"}
        onClick={() => onChange("income")}
      >
        <ArrowDownLeft size={17} /> Receita
      </button>
    </div>
  );
}

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TransactionKind } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/kind-toggle/kind-toggle.module.css";

export function KindToggle({
  kind,
  disabled,
  onChange,
}: {
  kind: TransactionKind;
  disabled?: boolean;
  onChange: (kind: TransactionKind) => void;
}) {
  return (
    <ToggleGroup
      className={styles.kindToggle}
      aria-label="Tipo da transação"
      value={[kind]}
      disabled={disabled}
      onValueChange={(values) => {
        const next = values[0];

        if (next === "income" || next === "expense") onChange(next);
      }}
    >
      <Toggle
        type="button"
        disabled={disabled}
        className={kind === "expense" ? styles.active : ""}
        value="expense"
      >
        <ArrowUpRight size={17} /> Despesa
      </Toggle>
      <Toggle
        type="button"
        disabled={disabled}
        className={kind === "income" ? styles.active : ""}
        value="income"
      >
        <ArrowDownLeft size={17} /> Receita
      </Toggle>
    </ToggleGroup>
  );
}

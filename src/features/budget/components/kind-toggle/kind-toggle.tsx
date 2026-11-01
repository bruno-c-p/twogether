import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { KINDS } from "@/features/budget/constants";
import { transactionKindSchema } from "@/features/budget/domain/schemas";
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
        const next = transactionKindSchema.safeParse(values[0]);

        if (next.success) onChange(next.data);
      }}
    >
      {transactionKindSchema.options.map((value) => {
        const { label, icon: Icon } = KINDS[value];

        return (
          <Toggle
            key={value}
            type="button"
            disabled={disabled}
            className={kind === value ? styles.active : ""}
            value={value}
          >
            <Icon size={17} /> {label}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
}

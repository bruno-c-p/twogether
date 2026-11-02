import {
  RadioGroup,
  RadioGroupOption,
} from "@/components/glaze/ui/radio-group";
import { KINDS } from "@/features/budget/constants";
import { transactionKindSchema } from "@/features/budget/domain/schemas";
import type { TransactionKind } from "@/features/budget/domain/types";

// A radio row, not a segmented control: three labels do not fit Glaze's
// segments inside a dialog at 320px, and a row of radios wraps instead.
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
    <RadioGroup
      className="flex flex-wrap gap-x-5 gap-y-2"
      aria-label="Tipo da transação"
      value={kind}
      disabled={disabled}
      onValueChange={(value) => {
        const next = transactionKindSchema.safeParse(value);

        if (next.success) onChange(next.data);
      }}
    >
      {transactionKindSchema.options.map((value) => (
        <RadioGroupOption
          key={value}
          value={value}
          label={KINDS[value].label}
        />
      ))}
    </RadioGroup>
  );
}

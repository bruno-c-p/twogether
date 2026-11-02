import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/glaze/ui/segmented-control";
import { KINDS } from "@/features/budget/constants";
import { transactionKindSchema } from "@/features/budget/domain/schemas";
import type { TransactionKind } from "@/features/budget/domain/types";

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
    <SegmentedControl
      fill
      aria-label="Tipo da transação"
      value={kind}
      disabled={disabled}
      onValueChange={(value) => {
        const next = transactionKindSchema.safeParse(value);

        if (next.success) onChange(next.data);
      }}
    >
      {transactionKindSchema.options.map((value) => (
        <SegmentedControlItem key={value} value={value}>
          {KINDS[value].label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

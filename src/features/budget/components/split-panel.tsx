import { Button } from "@/components/glaze/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/glaze/ui/field";
import { Switch } from "@/components/glaze/ui/switch";
import { money, shortDay } from "@/features/budget/domain/format";
import { centsSchema } from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import type { TransactionStatus } from "@/features/budget/domain/status";
import type { Transaction } from "@/features/budget/domain/types";

const capitalize = (value: string) =>
  value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);

function splitHint(
  status: TransactionStatus | undefined,
  checked: boolean,
  share: number,
  names: { payer: string; debtor: string },
) {
  if (status?.paidAt)
    return "Pagamento registrado. Valor, tipo e divisão ficam travados enquanto estiver pago.";

  if (checked && share)
    return capitalize(`${names.debtor} deve ${money(share)} a ${names.payer}.`);

  return "Metade fica com cada pessoa.";
}

function settlementStatus(
  transaction: Transaction,
  paidAt: string | undefined,
  debtorName: string,
  userIsDebtor: boolean,
) {
  if (paidAt) {
    return `Pago por ${debtorName} em ${shortDay(paidAt)}.`;
  }

  return userIsDebtor
    ? `Você deve ${money(partnerShare(transaction.amount))}.`
    : `Aguardando ${debtorName}.`;
}

function SettlementRow({
  transaction,
  paidAt,
  debtorName,
  userIsDebtor,
  busy,
  onSettle,
  onUnsettle,
}: {
  transaction: Transaction;
  paidAt: string | undefined;
  debtorName: string;
  userIsDebtor: boolean;
  busy: boolean;
  onSettle: () => void;
  onUnsettle: () => void;
}) {
  const paid = Boolean(paidAt);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-faint pt-3">
      <span className="type-body-sm text-text-2">
        {settlementStatus(transaction, paidAt, debtorName, userIsDebtor)}
      </span>
      {userIsDebtor && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={paid ? onUnsettle : onSettle}
        >
          {paid ? "Desmarcar pagamento" : "Marcar como pago"}
        </Button>
      )}
    </div>
  );
}

export function SplitPanel({
  checked,
  amount,
  transaction,
  status,
  title,
  payerName,
  debtorName,
  userIsDebtor,
  busy,
  onChange,
  onSettle,
  onUnsettle,
}: {
  checked: boolean;
  amount: number;
  transaction: Transaction | null;
  status: TransactionStatus | undefined;
  title: string;
  payerName: string;
  debtorName: string;
  userIsDebtor: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
  onSettle: () => void;
  onUnsettle: () => void;
}) {
  const paidAt = status?.paidAt;
  const cents = centsSchema.safeParse(amount).data;
  const share = cents && cents >= 2 ? partnerShare(cents) : 0;

  return (
    <section aria-label="Divisão" className="flex flex-col gap-3">
      <Field orientation="horizontal" disabled={Boolean(paidAt)}>
        <FieldContent>
          <FieldLabel>{title}</FieldLabel>
          <FieldDescription>
            {splitHint(status, checked, share, {
              payer: payerName,
              debtor: debtorName,
            })}
          </FieldDescription>
        </FieldContent>
        <Switch checked={checked} onCheckedChange={(next) => onChange(next)} />
      </Field>
      {transaction && status?.split && (
        <SettlementRow
          transaction={transaction}
          paidAt={paidAt}
          debtorName={debtorName}
          userIsDebtor={userIsDebtor}
          busy={busy}
          onSettle={onSettle}
          onUnsettle={onUnsettle}
        />
      )}
    </section>
  );
}

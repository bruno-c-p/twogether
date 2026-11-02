import { Button } from "@/components/glaze/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/glaze/ui/collapsible";
import { SkeletonText } from "@/components/glaze/ui/skeleton";
import { shortDay } from "@/features/budget/domain/format";
import { partnerShare, type splitDebt } from "@/features/budget/domain/split";
import { transactionStatus } from "@/features/budget/domain/status";
import type { Member, Transaction } from "@/features/budget/domain/types";

function headline(net: number, open: number, partner: Member, money: string) {
  if (net > 0) return `${partner.name} te deve ${money}`;

  if (net < 0) return `Você deve ${money} a ${partner.name}`;

  return open ? "Vocês estão quites" : "Nada pendente entre vocês";
}

function detail(open: number, waiting: boolean, partner: Member) {
  if (!open)
    return `Ative “Dividir com ${partner.name}” ao lançar uma despesa.`;

  const count =
    open === 1
      ? "1 despesa dividida em aberto"
      : `${open} despesas divididas em aberto`;

  return waiting ? `${count} · aguardando ${partner.name}` : count;
}

type Debt = ReturnType<typeof splitDebt>;

export function SplitDebtCard({
  debt,
  ...props
}: {
  // Null until hydration, when the reader's date decides what is owed.
  debt: Debt | null;
  userId: string;
  partner: Member;
  busy: boolean;
  displayMoney: (value: number) => string;
  onSettle: (transaction: Transaction) => void;
}) {
  if (!debt) {
    return (
      <Card role="region" aria-label="Acerto entre vocês" aria-busy="true">
        <CardHeader>
          <CardTitle>
            <h2 className="type-heading">Acerto entre vocês</h2>
          </CardTitle>
          <SkeletonText type="body-sm" className="col-start-1 w-3/5" />
        </CardHeader>
      </Card>
    );
  }

  return <DebtCard debt={debt} {...props} />;
}

function DebtCard({
  debt: { net, unpaid },
  userId,
  partner,
  busy,
  displayMoney,
  onSettle,
}: {
  debt: Debt;
  userId: string;
  partner: Member;
  busy: boolean;
  displayMoney: (value: number) => string;
  onSettle: (transaction: Transaction) => void;
}) {
  // The oldest split the user owes; settling it exposes the next one.
  const owed = unpaid.find(
    (transaction) => transactionStatus(transaction, userId).userOwes,
  );

  return (
    <Card role="region" aria-label="Acerto entre vocês">
      <CardHeader>
        <CardTitle>
          <h2 className="type-heading tabular-nums">
            {headline(net, unpaid.length, partner, displayMoney(Math.abs(net)))}
          </h2>
        </CardTitle>
        <CardDescription>
          {detail(unpaid.length, unpaid.length > 0 && !owed, partner)}
        </CardDescription>
      </CardHeader>
      {unpaid.length > 0 && (
        <CardContent flush>
          <UnpaidList
            unpaid={unpaid}
            userId={userId}
            partner={partner}
            displayMoney={displayMoney}
          />
        </CardContent>
      )}
      {owed && (
        <CardFooter>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onSettle(owed)}
          >
            Marcar como pago
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Collapsed by default so a long month doesn't stretch the overview row.
function UnpaidList({
  unpaid,
  userId,
  partner,
  displayMoney,
}: {
  unpaid: Transaction[];
  userId: string;
  partner: Member;
  displayMoney: (value: number) => string;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="m-1">
        Despesas em aberto
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="max-h-68 overflow-y-auto border-t border-line-faint">
          {unpaid.map((transaction) => (
            <li
              key={transaction.id}
              className="rule-row flex items-center justify-between gap-3 px-3 py-2 type-body-sm"
            >
              {/* Who owes sits on its own line so a long description can't truncate it away. */}
              <span className="min-w-0 flex flex-col">
                <span className="truncate" title={transaction.description}>
                  {transaction.description}
                </span>
                <span className="truncate type-caption text-text-2">
                  {transactionStatus(transaction, userId).userOwes
                    ? "Você deve"
                    : `${partner.name} deve`}
                  {" · "}
                  {shortDay(transaction.date)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {displayMoney(partnerShare(transaction.amount))}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

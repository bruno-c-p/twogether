import { Card, CardContent } from "@/components/glaze/ui/card";
import type { summarize } from "@/features/budget/domain/calc";
import { PersonAvatar } from "@/components/app/person-avatar";
import { cx } from "@/lib/cx";

type Partner = {
  memberId: string;
  name: string;
  position: number;
  income: number;
  expenses: number;
};

type Flow = "income" | "expenses";

export function MonthTotalsCard({
  summary,
  partners,
  displayMoney,
  className,
}: {
  summary: ReturnType<typeof summarize>;
  partners?: Partner[];
  displayMoney: (value: number) => string;
  className?: string;
}) {
  return (
    <Card
      role="region"
      aria-label="Entradas e saídas do mês"
      className={className}
    >
      <CardContent
        className={cx(
          "grid gap-x-8 gap-y-6",
          // Side by side for a couple (stacked on phones); a single person's
          // two totals stack and center in the space the split card would use.
          partners
            ? "grid-cols-2 content-start max-sm:grid-cols-1"
            : "grid-cols-1 content-center",
        )}
      >
        <Totals
          label="Entradas"
          flow="income"
          total={summary.income}
          partners={partners}
          displayMoney={displayMoney}
        />
        <Totals
          label="Saídas"
          flow="expenses"
          total={summary.expenses}
          partners={partners}
          displayMoney={displayMoney}
        />
      </CardContent>
    </Card>
  );
}

function Totals({
  label,
  flow,
  total,
  partners,
  displayMoney,
}: {
  label: string;
  flow: Flow;
  total: number;
  partners?: Partner[];
  displayMoney: (value: number) => string;
}) {
  return (
    <div className="min-w-0">
      <dl className="flex items-baseline justify-between gap-3">
        <dt className="type-label text-text-2">{label}</dt>
        <dd className="type-heading tabular-nums whitespace-nowrap">
          {displayMoney(total)}
        </dd>
      </dl>
      {partners && (
        <dl className="mt-3 flex flex-col gap-2 border-t border-line-faint pt-3">
          {partners.map((partner) => (
            <div
              key={partner.memberId}
              className="flex items-center justify-between gap-3 type-body-sm"
            >
              <dt className="flex items-center gap-2 min-w-0">
                <PersonAvatar
                  aria-hidden="true"
                  name={partner.name}
                  position={partner.position}
                  className="size-5"
                />
                <span className="truncate" title={partner.name}>
                  {partner.name}
                </span>
              </dt>
              <dd
                className={cx(
                  "font-medium tabular-nums whitespace-nowrap",
                  partner[flow] === 0 && "text-text-2",
                )}
              >
                {displayMoney(partner[flow])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

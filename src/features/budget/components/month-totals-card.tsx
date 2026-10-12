import { OverviewCard } from "@/features/budget/components/overview-card";
import type { summarize } from "@/features/budget/domain/calc";
import { PersonAvatar } from "@/components/ui/person-avatar";
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
  hidden,
  displayMoney,
  className,
}: {
  summary: ReturnType<typeof summarize>;
  partners?: Partner[];
  hidden: boolean;
  displayMoney: (value: number) => string;
  className?: string;
}) {
  return (
    <OverviewCard
      aria-label="Entradas e saídas do mês"
      className={cx(
        "grid gap-x-8 gap-y-6",
        // Side by side for a couple (stacked on phones); a single person's
        // two totals stack and center in the space the split card would use.
        partners
          ? "grid-cols-2 content-start max-bp620:grid-cols-1"
          : "grid-cols-1 content-center",
        className,
      )}
    >
      <Totals
        label="Entradas"
        flow="income"
        total={summary.income}
        partners={partners}
        hidden={hidden}
        displayMoney={displayMoney}
      />
      <Totals
        label="Saídas"
        flow="expenses"
        total={summary.expenses}
        partners={partners}
        hidden={hidden}
        displayMoney={displayMoney}
      />
    </OverviewCard>
  );
}

function Totals({
  label,
  flow,
  total,
  partners,
  hidden,
  displayMoney,
}: {
  label: string;
  flow: Flow;
  total: number;
  partners?: Partner[];
  hidden: boolean;
  displayMoney: (value: number) => string;
}) {
  return (
    <div className="min-w-0">
      <dl className="m-0 flex items-baseline justify-between gap-3">
        <dt className="text-sm font-500 text-text-muted">{label}</dt>
        <dd className="m-0 font-heading text-lg font-700 tabular-nums whitespace-nowrap">
          {displayMoney(total)}
        </dd>
      </dl>
      {partners && (
        <>
          <ShareBar
            parts={partners.map((partner) => ({
              id: partner.memberId,
              position: partner.position,
              value: partner[flow],
            }))}
            hidden={hidden || total <= 0}
          />
          <dl className="m-0">
            {partners.map((partner) => (
              <div
                key={partner.memberId}
                className="flex items-center justify-between gap-3 mt-3 text-md"
              >
                <dt className="flex items-center gap-2 min-w-0">
                  <PersonAvatar
                    aria-hidden="true"
                    name={partner.name}
                    position={partner.position}
                    className="w-[22px] h-[22px] text-xs"
                  />
                  <span className="truncate" title={partner.name}>
                    {partner.name}
                  </span>
                </dt>
                <dd
                  className={cx(
                    "m-0 font-600 tabular-nums whitespace-nowrap",
                    partner[flow] === 0 && "text-text-muted",
                  )}
                >
                  {displayMoney(partner[flow])}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

// Each partner's share of the total as a segment in their own color.
function ShareBar({
  parts,
  hidden,
}: {
  parts: { id: string; position: number; value: number }[];
  hidden: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex gap-1 h-[8px] mt-3 mb-4 rounded-full bg-surface-2"
    >
      {!hidden &&
        parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <span
              key={part.id}
              className={cx(
                "h-full rounded-full min-w-[8px]",
                part.position === 0
                  ? "bg-person-a shadow-[inset_0_0_0_1.5px_var(--on-person-a)]"
                  : "bg-person-b",
              )}
              style={{ flexGrow: part.value, flexBasis: 0 }}
            />
          ))}
    </div>
  );
}

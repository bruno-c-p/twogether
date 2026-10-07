import { Select } from "@/components/ui/select";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type {
  GoalId,
  Transaction,
  Member,
} from "@/features/budget/domain/types";
import type { KindFilter } from "@/features/budget/search";
import { TransactionRow } from "@/features/budget/components/transaction-row/transaction-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/budget/components/empty-state";
import { cx } from "@/lib/cx";

interface TransactionFilters {
  query: string;
  goalFilter: GoalId | "all";
  tagFilter: string;
  kindFilter: KindFilter | "all";
  setQuery: (value: string) => void;
  setGoalFilter: (value: GoalId | "all") => void;
  setTag: (value: string) => void;
  setKindFilter: (value: KindFilter | "all") => void;
}

type RowActions = {
  members: Member[];
  userId: string;
  busy: boolean;
  hidden: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

interface Props extends RowActions {
  transactions: Transaction[];
  filters: TransactionFilters;
  onAdd: () => void;
}

const KIND_CHIPS: Array<{ value: KindFilter | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "expense", label: "Despesas" },
  { value: "income", label: "Receitas" },
  { value: "split", label: "Divididas" },
];

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  weekday: "long",
});

function dayLabel(date: string) {
  const parts = dayFormatter.formatToParts(new Date(`${date}T12:00:00`));

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  const weekday = part("weekday").split("-")[0];

  return `${part("day")} ${part("month").replace(".", "")} · ${weekday}`;
}

function searchableText(transaction: Transaction) {
  const goal = GOALS.find((g) => g.id === transaction.goal)?.name ?? "";

  return `${transaction.description} ${transaction.tags.join(" ")} ${goal}`.toLocaleLowerCase(
    "pt-BR",
  );
}

function matchesKind(transaction: Transaction, kind: KindFilter | "all") {
  if (kind === "all") return true;

  if (kind === "split") return Boolean(transaction.split);

  return transaction.kind === kind;
}

function matchesFilters(transaction: Transaction, filters: TransactionFilters) {
  const { query, goalFilter, tagFilter, kindFilter } = filters;

  if (
    query &&
    !searchableText(transaction).includes(query.toLocaleLowerCase("pt-BR"))
  )
    return false;

  if (goalFilter !== "all" && transaction.goal !== goalFilter) return false;

  if (tagFilter && !transaction.tags.includes(tagFilter)) return false;

  return matchesKind(transaction, kindFilter);
}

function hasActiveFilters(filters: TransactionFilters) {
  return (
    !!filters.query ||
    filters.goalFilter !== "all" ||
    !!filters.tagFilter ||
    filters.kindFilter !== "all"
  );
}

function groupByDay(transactions: Transaction[]) {
  const groups: Array<{ date: string; items: Transaction[]; net: number }> = [];

  for (const t of transactions) {
    const signed = t.kind === "income" ? t.amount : -t.amount;
    const last = groups.at(-1);

    if (last?.date === t.date) {
      last.items.push(t);
      last.net += signed;
    } else {
      groups.push({ date: t.date, items: [t], net: signed });
    }
  }

  return groups;
}

function netLabel(net: number, hidden: boolean) {
  if (hidden) return "R$ ••••";

  return `${net < 0 ? "−" : "+"} ${money(Math.abs(net))}`;
}

export function TransactionSearch({
  query,
  setQuery,
}: Pick<TransactionFilters, "query" | "setQuery">) {
  return (
    <div className="relative flex items-center w-[280px] max-bp620:w-full">
      <Search
        size={14}
        aria-hidden="true"
        className="absolute left-[13px] text-text-muted pointer-events-none"
      />
      <Input
        aria-label="Buscar transações"
        placeholder="Buscar…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-h-[43px] pl-8 pr-10 rounded-sm border border-solid border-line-strong bg-surface text-sm"
      />
      {query && (
        <Button
          variant="icon"
          className="absolute right-[5px]"
          onClick={() => setQuery("")}
          aria-label="Limpar busca"
        >
          <X size={15} />
        </Button>
      )}
    </div>
  );
}

function FilterBar({ filters }: { filters: TransactionFilters }) {
  const { goalFilter, kindFilter, tagFilter } = filters;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <ToggleGroup
        className="flex items-center gap-2 flex-wrap"
        aria-label="Tipo de transação"
        value={[kindFilter]}
        onValueChange={(values) => {
          const chip = KIND_CHIPS.find((item) => item.value === values[0]);

          if (chip) filters.setKindFilter(chip.value);
        }}
      >
        {KIND_CHIPS.map((chip) => (
          <Toggle
            key={chip.value}
            value={chip.value}
            className={cx(
              "px-4 py-2 rounded-full border border-solid text-sm",
              kindFilter === chip.value
                ? "bg-green text-on-brand border-green"
                : "bg-surface text-text border-border hover:bg-surface-soft",
            )}
          >
            {chip.label}
          </Toggle>
        ))}
      </ToggleGroup>
      <Select
        label="Filtrar por meta"
        value={goalFilter}
        onValueChange={filters.setGoalFilter}
        items={[
          { value: "all", label: "Todas as metas" },
          ...GOALS.map((goal) => ({ value: goal.id, label: goal.name })),
        ]}
        className={cx(
          "px-4 py-2 rounded-full border border-solid text-sm cursor-pointer",
          goalFilter === "all"
            ? "bg-surface text-text border-border hover:bg-surface-soft"
            : "bg-green text-on-brand border-green",
        )}
      />
      {tagFilter && (
        <>
          <span className="sr-only">Filtrando por</span>
          <Button variant="tag" onClick={() => filters.setTag("")}>
            #{tagFilter}
            <X size={13} />
          </Button>
        </>
      )}
    </div>
  );
}

function NoTransactions({
  filters,
  onAdd,
}: {
  filters: TransactionFilters;
  onAdd: () => void;
}) {
  const filtering = hasActiveFilters(filters);

  function clearFilters() {
    filters.setQuery("");
    filters.setGoalFilter("all");
    filters.setTag("");
    filters.setKindFilter("all");
  }

  if (filtering)
    return (
      <EmptyState
        icon={<Search size={25} strokeWidth={1.5} />}
        title="Nenhuma transação encontrada."
        action={
          <Button variant="secondary" className="mt-2" onClick={clearFilters}>
            Limpar filtros
          </Button>
        }
      >
        Ajuste a busca ou os filtros.
      </EmptyState>
    );

  return (
    <EmptyState
      icon={<Search size={25} strokeWidth={1.5} />}
      title="Nenhuma transação neste mês."
      action={
        <Button className="mt-2" onClick={onAdd}>
          Adicionar transação
        </Button>
      }
    >
      Adicione uma receita ou despesa para começar.
    </EmptyState>
  );
}

export function TransactionList({
  transactions,
  filters,
  onAdd,
  ...row
}: Props) {
  const filtered = transactions
    .filter((t) => matchesFilters(t, filters))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <section aria-label="Transações do mês">
      <FilterBar filters={filters} />
      <div className="rounded-lg border border-solid border-border bg-surface overflow-hidden">
        {filtered.length ? (
          groupByDay(filtered).map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-between gap-3 px-6 max-bp1000:px-4 py-2 bg-surface-soft border-0 border-t border-solid border-border first:border-t-0 text-xs">
                <time dateTime={group.date} className="font-500">
                  {dayLabel(group.date)}
                </time>
                <span className="text-text-muted">
                  {netLabel(group.net, row.hidden)}
                </span>
              </div>
              {group.items.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  {...row}
                  onTag={filters.setTag}
                />
              ))}
            </div>
          ))
        ) : (
          <NoTransactions filters={filters} onAdd={onAdd} />
        )}
      </div>
    </section>
  );
}

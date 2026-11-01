import { useRef } from "react";
import Big from "big.js";
import { useQueryState } from "nuqs";
import { Select } from "@/components/ui/select";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import { signedFlow } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { matchesKind, matchesQuery } from "@/features/budget/domain/view";
import type {
  GoalId,
  Transaction,
  Member,
} from "@/features/budget/domain/types";
import { pageParam, type KindFilter } from "@/features/budget/search";
import { TransactionRow } from "@/features/budget/components/transaction-row/transaction-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cx } from "@/lib/cx";

interface TransactionFilters {
  query: string;
  goalFilter: GoalId | "all";
  kindFilter: KindFilter | "all";
  setQuery: (value: string) => void;
  setGoalFilter: (value: GoalId | "all") => void;
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
  { value: "transfer", label: "Transferências" },
  { value: "split", label: "Divididas" },
];

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  weekday: "long",
  timeZone: "UTC",
});

function dayLabel(date: string) {
  const parts = dayFormatter.formatToParts(new Date(`${date}T12:00:00Z`));

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  const weekday = part("weekday").split("-")[0];

  return `${part("day")} ${part("month").replace(".", "")} · ${weekday}`;
}

function matchesFilters(transaction: Transaction, filters: TransactionFilters) {
  const { query, goalFilter, kindFilter } = filters;

  if (query && !matchesQuery(transaction, query)) return false;

  if (goalFilter !== "all" && transaction.goal !== goalFilter) return false;

  return kindFilter === "all" || matchesKind(transaction, kindFilter);
}

function hasActiveFilters(filters: TransactionFilters) {
  return (
    !!filters.query ||
    filters.goalFilter !== "all" ||
    filters.kindFilter !== "all"
  );
}

function groupByDay(transactions: Transaction[]) {
  const groups: Array<{ date: string; items: Transaction[]; net: number }> = [];

  for (const t of transactions) {
    const signed = signedFlow(t);
    const last = groups.at(-1);

    if (last?.date === t.date) {
      last.items.push(t);
      last.net = new Big(last.net).plus(signed).toNumber();
    } else {
      groups.push({ date: t.date, items: [t], net: signed });
    }
  }

  return groups;
}

function netLabel(net: number, hidden: boolean) {
  if (hidden) return "R$ ••••";

  const sign = net < 0 ? "− " : net > 0 ? "+ " : "";

  return `${sign}${money(Math.abs(net))}`;
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
        inputMode="search"
        enterKeyHint="search"
        placeholder="Buscar…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-h-[43px] pl-8 pr-10 rounded-sm border border-solid border-line-strong bg-surface text-sm"
      />
      {query && (
        <Button
          variant="icon"
          className="!absolute right-[5px]"
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
  const { goalFilter, kindFilter } = filters;

  return (
    <div
      className={cx(
        "flex items-center gap-2 flex-wrap mb-4",
        "max-bp1000:flex-nowrap max-bp1000:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // Bleed past main's side padding (src/styles.css) so chips run off
        // the screen edge and the row reads as scrollable.
        "max-bp1000:mx-[-28px] max-bp1000:px-[28px]",
        "max-bp800:mx-[-22px] max-bp800:px-[22px]",
        "max-bp620:mx-[-19px] max-bp620:px-[19px]",
      )}
    >
      <ToggleGroup
        className="flex items-center gap-2 flex-wrap max-bp1000:flex-nowrap"
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
              "px-4 py-2 rounded-full border border-solid text-sm whitespace-nowrap",
              kindFilter === chip.value
                ? "bg-green text-on-brand border-green"
                : "bg-surface text-text border-border @hover:bg-surface-soft",
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
          "px-4 py-2 rounded-full border border-solid text-sm cursor-pointer shrink-0 whitespace-nowrap",
          goalFilter === "all"
            ? "bg-surface text-text border-border @hover:bg-surface-soft"
            : "bg-green text-on-brand border-green",
        )}
      />
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

const PAGE_SIZE = 50;

function TransactionPages({
  transactions,
  ...row
}: RowActions & {
  transactions: Transaction[];
}) {
  const [selectedPage, setPage] = useQueryState(
    "page",
    pageParam.withOptions({ history: "push" }),
  );

  const list = useRef<HTMLDivElement>(null);
  const pages = Math.ceil(transactions.length / PAGE_SIZE);
  const page = Math.min(selectedPage, pages - 1);
  const start = page * PAGE_SIZE;

  const visibleIds = new Set(
    transactions.slice(start, start + PAGE_SIZE).map((t) => t.id),
  );

  const groups = groupByDay(transactions)
    .map((group) => ({
      ...group,
      items: group.items.filter((t) => visibleIds.has(t.id)),
    }))
    .filter((group) => group.items.length);

  function pickPage(next: number) {
    void setPage(next);
    list.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div ref={list} className="grid gap-5 bp1000:gap-6">
      {groups.map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <div className="flex items-baseline justify-between gap-3 px-1 pb-2 text-xs">
            <time
              id={`day-${group.date}`}
              dateTime={group.date}
              className="font-600"
            >
              {dayLabel(group.date)}
            </time>
            <span
              className="text-text-muted tabular-nums"
              title="Total do dia nos resultados filtrados"
            >
              {netLabel(group.net, row.hidden)}
            </span>
          </div>
          <ul className="m-0 p-0 list-none rounded-lg bg-surface overflow-clip">
            {group.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} {...row} />
            ))}
          </ul>
        </section>
      ))}
      {pages > 1 && (
        <nav
          aria-label="Páginas de transações"
          className="flex items-center justify-between flex-wrap gap-3 px-1"
        >
          <p
            aria-live="polite"
            className="m-0 text-sm text-text-muted tabular-nums basis-full"
          >
            {`${(start + 1).toLocaleString("pt-BR")}–${Math.min(start + PAGE_SIZE, transactions.length).toLocaleString("pt-BR")} de ${transactions.length.toLocaleString("pt-BR")} transações · Página ${page + 1} de ${pages}`}
          </p>
          <Button
            variant="secondary"
            disabled={page === 0}
            onClick={() => pickPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={page === pages - 1}
            onClick={() => pickPage(page + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}
    </div>
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
      {filtered.length ? (
        <TransactionPages transactions={filtered} {...row} />
      ) : (
        <div className="rounded-lg bg-surface overflow-clip">
          <NoTransactions filters={filters} onAdd={onAdd} />
        </div>
      )}
    </section>
  );
}

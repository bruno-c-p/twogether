import { useRef } from "react";
import Big from "big.js";
import { createSerializer, useQueryState, useQueryStates } from "nuqs";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Button } from "@/components/glaze/ui/button";
import { Chip } from "@/components/glaze/ui/chip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/glaze/ui/empty-state";
import { Input } from "@/components/glaze/ui/input";
import { ItemGroup } from "@/components/glaze/ui/item";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/glaze/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/glaze/ui/select";
import { GOALS } from "@/features/budget/constants";
import { signedFlow } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { matchesKind, matchesQuery } from "@/features/budget/domain/view";
import type {
  GoalId,
  Transaction,
  Member,
} from "@/features/budget/domain/types";
import {
  pageParam,
  transactionFilterParams,
  workspaceParams,
  type KindFilter,
} from "@/features/budget/search";
import { TransactionRow } from "@/features/budget/components/transaction-row/transaction-row";

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

const GOAL_FILTERS: Array<{ value: GoalId | "all"; label: string }> = [
  { value: "all", label: "Todas as metas" },
  ...GOALS.map((goal) => ({ value: goal.id, label: goal.name })),
];

// A page link keeps the month, the person and the filters it was shown with.
const linkedParams = { ...workspaceParams, ...transactionFilterParams };

const pageHref = createSerializer({ ...linkedParams, page: pageParam });

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
    <Input
      mode="search"
      className="w-full sm:w-72"
      aria-label="Buscar transações"
      clearLabel="Limpar busca"
      inputMode="search"
      enterKeyHint="search"
      placeholder="Buscar…"
      value={query}
      onValueChange={setQuery}
    />
  );
}

function FilterBar({ filters }: { filters: TransactionFilters }) {
  const { goalFilter, kindFilter } = filters;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1">
      <ToggleGroup
        className="flex flex-wrap items-center gap-1"
        aria-label="Tipo de transação"
        value={[kindFilter]}
        onValueChange={(values) => {
          const chip = KIND_CHIPS.find((item) => item.value === values[0]);

          if (chip) filters.setKindFilter(chip.value);
        }}
      >
        {KIND_CHIPS.map((chip) => (
          <Chip key={chip.value} value={chip.value}>
            {chip.label}
          </Chip>
        ))}
      </ToggleGroup>
      <Select
        items={GOAL_FILTERS}
        value={goalFilter}
        onValueChange={(value) => {
          const next = GOAL_FILTERS.find((item) => item.value === value);

          if (next) filters.setGoalFilter(next.value);
        }}
      >
        <SelectTrigger size="sm" aria-label="Filtrar por meta">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GOAL_FILTERS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  function clearFilters() {
    filters.setQuery("");
    filters.setGoalFilter("all");
    filters.setKindFilter("all");
  }

  if (hasActiveFilters(filters))
    return (
      <Empty reason="no-results">
        <EmptyHeader>
          <EmptyTitle>Nenhuma transação encontrada.</EmptyTitle>
          <EmptyDescription>Ajuste a busca ou os filtros.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </EmptyContent>
      </Empty>
    );

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Nenhuma transação neste mês.</EmptyTitle>
        <EmptyDescription>
          Adicione uma receita ou despesa para começar.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAdd}>Adicionar transação</Button>
      </EmptyContent>
    </Empty>
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

  const [linked] = useQueryStates(linkedParams);
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

  function pageLink(next: number, disabled: boolean) {
    return {
      href: pageHref({ ...linked, page: next }),
      disabled,
      onClick: (event: { preventDefault: () => void }) => {
        event.preventDefault();
        pickPage(next);
      },
    };
  }

  return (
    <div ref={list} className="flex flex-col gap-5 lg:gap-6">
      {groups.map((group) => (
        <section
          key={group.date}
          aria-labelledby={`day-${group.date}`}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between gap-3 px-1">
            <time
              id={`day-${group.date}`}
              dateTime={group.date}
              className="type-label text-text-1"
            >
              {dayLabel(group.date)}
            </time>
            <span
              className="type-caption text-text-2 tabular-nums"
              title="Total do dia nos resultados filtrados"
            >
              {netLabel(group.net, row.hidden)}
            </span>
          </div>
          <ItemGroup>
            {group.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} {...row} />
            ))}
          </ItemGroup>
        </section>
      ))}
      {pages > 1 && (
        <Pagination
          aria-label="Páginas de transações"
          className="flex-wrap gap-2 px-1"
        >
          <p
            aria-live="polite"
            className="basis-full type-body-sm text-text-2 tabular-nums"
          >
            {`${(start + 1).toLocaleString("pt-BR")}–${Math.min(start + PAGE_SIZE, transactions.length).toLocaleString("pt-BR")} de ${transactions.length.toLocaleString("pt-BR")} transações · Página ${page + 1} de ${pages}`}
          </p>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="Anterior"
                aria-label="Anterior"
                {...pageLink(page - 1, page === 0)}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                text="Próxima"
                aria-label="Próxima"
                {...pageLink(page + 1, page === pages - 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
        <NoTransactions filters={filters} onAdd={onAdd} />
      )}
    </section>
  );
}

import { ArrowUpRight, Search, X } from "lucide-react";
import { GOALS } from "@/features/budget/constants";
import type {
  BankAccount,
  GoalId,
  Transaction,
  TransactionKind,
  Member,
} from "@/features/budget/domain/types";
import { TransactionRow } from "@/features/budget/components/transaction-row/transaction-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/budget/components/empty-state";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import styles from "@/features/budget/components/transaction-list/transaction-list.module.css";

interface TransactionFilters {
  query: string;
  goalFilter: GoalId | "all";
  tagFilter: string;
  kindFilter: TransactionKind | "all";
  setQuery: (value: string) => void;
  setGoalFilter: (value: GoalId | "all") => void;
  setTag: (value: string) => void;
  setKindFilter: (value: TransactionKind | "all") => void;
}

type RowActions = {
  members: Member[];
  accounts: BankAccount[];
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
  compact: boolean;
  onViewAll: () => void;
}

const COMPACT_LIMIT = 5;

function searchableText(transaction: Transaction) {
  const goal = GOALS.find((g) => g.id === transaction.goal)?.name ?? "";

  return `${transaction.description} ${transaction.tags.join(" ")} ${goal}`.toLocaleLowerCase(
    "pt-BR",
  );
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

  return kindFilter === "all" || transaction.kind === kindFilter;
}

function hasActiveFilters(filters: TransactionFilters) {
  return (
    !!filters.query ||
    filters.goalFilter !== "all" ||
    !!filters.tagFilter ||
    filters.kindFilter !== "all"
  );
}

function footerLabel(shown: number, total: number, compact: boolean) {
  if (compact && total > shown)
    return `${shown} de ${total} transações neste mês`;

  return `${total} ${total === 1 ? "transação neste mês" : "transações neste mês"}`;
}

function TransactionToolbar({ filters }: { filters: TransactionFilters }) {
  const { query, goalFilter, kindFilter, setQuery } = filters;

  return (
    <div className={styles.transactionToolbar}>
      <div className={styles.searchField}>
        <Search size={18} />
        <input
          aria-label="Buscar transações"
          placeholder="Buscar uma transação..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <Button
            variant="icon"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
          >
            <X size={15} />
          </Button>
        )}
      </div>
      <div className={styles.filterSelects}>
        <select
          aria-label="Filtrar por meta"
          value={goalFilter}
          onChange={(event) => {
            const found = GOALS.find((g) => g.id === event.target.value);

            filters.setGoalFilter(found?.id ?? "all");
          }}
        >
          <option value="all">Todas as metas</option>
          {GOALS.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tipo"
          value={kindFilter}
          onChange={(event) => {
            const value = event.target.value;

            filters.setKindFilter(
              value === "expense" || value === "income" ? value : "all",
            );
          }}
        >
          <option value="all">Todos os tipos</option>
          <option value="expense">Despesas</option>
          <option value="income">Receitas</option>
        </select>
      </div>
    </div>
  );
}

function TransactionTable({
  transactions,
  onTag,
  ...row
}: RowActions & { transactions: Transaction[]; onTag: (tag: string) => void }) {
  return (
    <div className={styles.transactionTable}>
      <div className={styles.tableHead}>
        <span>TRANSAÇÃO</span>
        <span>META</span>
        <span>DATA</span>
        <span>VALOR</span>
        <span className={styles.srOnly}>Ações</span>
      </div>
      {transactions.map((t) => (
        <TransactionRow
          key={t.id}
          transaction={t}
          {...row}
          className={styles.transactionRow}
          onTag={onTag}
        />
      ))}
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
          <Button
            variant="secondary"
            className="mt-[8px]"
            onClick={clearFilters}
          >
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
        <Button className="mt-[8px]" onClick={onAdd}>
          Adicionar primeira transação
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
  compact,
  onViewAll,
  ...row
}: Props) {
  const filtered = transactions
    .filter((t) => matchesFilters(t, filters))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const shown = compact ? filtered.slice(0, COMPACT_LIMIT) : filtered;

  return (
    <Panel aria-labelledby="transactions-title">
      <SectionHeading
        title={compact ? "Últimas transações" : "Transações do mês"}
        titleId="transactions-title"
        count={transactions.length}
        description="Entradas e despesas registradas no mês."
      >
        {compact && (
          <Button variant="text" className={styles.seeAll} onClick={onViewAll}>
            Ver todas <ArrowUpRight size={17} />
          </Button>
        )}
      </SectionHeading>
      <TransactionToolbar filters={filters} />
      {filters.tagFilter && (
        <div className={styles.activeTagFilter}>
          <span>Filtrando por</span>
          <Button variant="tag" onClick={() => filters.setTag("")}>
            #{filters.tagFilter}
            <X size={13} />
          </Button>
        </div>
      )}
      {shown.length ? (
        <>
          <TransactionTable
            transactions={shown}
            onTag={filters.setTag}
            {...row}
          />
          <div className={styles.tableFooter}>
            <span>{footerLabel(shown.length, filtered.length, compact)}</span>
          </div>
        </>
      ) : (
        <NoTransactions filters={filters} onAdd={onAdd} />
      )}
    </Panel>
  );
}

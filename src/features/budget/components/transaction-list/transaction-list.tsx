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
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/features/budget/components/empty-state/empty-state";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import styles from "@/features/budget/components/transaction-list/transaction-list.module.css";

interface Props {
  transactions: Transaction[];
  members: Member[];
  accounts: BankAccount[];
  busy: boolean;
  hidden: boolean;
  query: string;
  goalFilter: GoalId | "all";
  tagFilter: string;
  kindFilter: TransactionKind | "all";
  onQuery: (value: string) => void;
  onGoal: (value: GoalId | "all") => void;
  onTag: (value: string) => void;
  onKind: (value: TransactionKind | "all") => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onAdd: () => void;
  compact: boolean;
  onViewAll: () => void;
}

export function TransactionList({
  transactions,
  members,
  accounts,
  busy,
  hidden,
  query,
  goalFilter,
  tagFilter,
  kindFilter,
  onQuery,
  onGoal,
  onTag,
  onKind,
  onEdit,
  onDelete,
  onAdd,
  compact,
  onViewAll,
}: Props) {
  const filtered = transactions
    .filter(
      (t) =>
        (!query ||
          `${t.description} ${t.tags.join(" ")} ${GOALS.find((g) => g.id === t.goal)?.name ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR"))) &&
        (goalFilter === "all" || t.goal === goalFilter) &&
        (!tagFilter || t.tags.includes(tagFilter)) &&
        (kindFilter === "all" || t.kind === kindFilter),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const shown = compact ? filtered.slice(0, 5) : filtered;
  const activeFilters =
    !!query || goalFilter !== "all" || !!tagFilter || kindFilter !== "all";
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
      <div className={styles.transactionToolbar}>
        <div className={styles.searchField}>
          <Search size={18} />
          <input
            aria-label="Buscar transações"
            placeholder="Buscar uma transação..."
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
          {query && (
            <Button
              variant="icon"
              onClick={() => onQuery("")}
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
              onGoal(found?.id ?? "all");
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
              onKind(value === "expense" || value === "income" ? value : "all");
            }}
          >
            <option value="all">Todos os tipos</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
          </select>
        </div>
      </div>
      {tagFilter && (
        <div className={styles.activeTagFilter}>
          <span>Filtrando por</span>
          <Button variant="tag" onClick={() => onTag("")}>
            #{tagFilter}
            <X size={13} />
          </Button>
        </div>
      )}
      {shown.length ? (
        <div className={styles.transactionTable}>
          <div className={styles.tableHead}>
            <span>TRANSAÇÃO</span>
            <span>META</span>
            <span>DATA</span>
            <span>VALOR</span>
            <span className={styles.srOnly}>Ações</span>
          </div>
          {shown.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              members={members}
              accounts={accounts}
              busy={busy}
              hidden={hidden}
              className={styles.transactionRow}
              onEdit={onEdit}
              onDelete={onDelete}
              onTag={onTag}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search size={25} strokeWidth={1.5} />}
          title={
            activeFilters
              ? "Nenhuma transação encontrada."
              : "Nenhuma transação neste mês."
          }
          action={
            activeFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  onQuery("");
                  onGoal("all");
                  onTag("");
                  onKind("all");
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={onAdd}>Adicionar primeira transação</Button>
            )
          }
        >
          {activeFilters
            ? "Ajuste a busca ou os filtros."
            : "Adicione uma receita ou despesa para começar."}
        </EmptyState>
      )}
      {shown.length > 0 && (
        <div className={styles.tableFooter}>
          <span>
            {compact && filtered.length > shown.length
              ? `${shown.length} de ${filtered.length} transações neste mês`
              : `${filtered.length} ${filtered.length === 1 ? "transação neste mês" : "transações neste mês"}`}
          </span>
        </div>
      )}
    </Panel>
  );
}

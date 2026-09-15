import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { GOALS } from "../constants";
import { money } from "../services/budget";
import type { BankAccount, GoalId, Transaction, Member } from "../types";
import { GoalIcon } from "./goal-icon";

interface Props {
  transactions: Transaction[];
  members: Member[];
  accounts: BankAccount[];
  busy: boolean;
  hidden: boolean;
  query: string;
  goalFilter: GoalId | "all";
  tagFilter: string;
  kindFilter: string;
  onQuery: (value: string) => void;
  onGoal: (value: GoalId | "all") => void;
  onTag: (value: string) => void;
  onKind: (value: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onAdd: () => void;
  compact: boolean;
  onViewAll: () => void;
}

export function TransactionList(props: Props) {
  const {
    transactions,
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
  } = props;
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
    <section
      className="transactions-panel"
      aria-labelledby="transactions-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="transactions-title">
            {compact ? "Últimas transações" : "Transações do mês"}
            <span className="count-badge">{transactions.length}</span>
          </h2>
          <p>Entradas e despesas registradas no mês.</p>
        </div>
        {compact && (
          <button className="text-button see-all" onClick={onViewAll}>
            Ver todas <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      <div className="transaction-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar transações"
            placeholder="Buscar uma transação..."
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              onClick={() => onQuery("")}
              aria-label="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="filter-selects">
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
            onChange={(event) => onKind(event.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
          </select>
        </div>
      </div>
      {tagFilter && (
        <div className="active-tag-filter">
          <span>Filtrando por</span>
          <button className="tag" onClick={() => onTag("")}>
            #{tagFilter}
            <X size={13} />
          </button>
        </div>
      )}
      {shown.length ? (
        <div className="transaction-table">
          <div className="table-head">
            <span>TRANSAÇÃO</span>
            <span>META</span>
            <span>DATA</span>
            <span>VALOR</span>
            <span className="sr-only">Ações</span>
          </div>
          {shown.map((t) => {
            const goal = GOALS.find((g) => g.id === t.goal);
            const date = new Date(`${t.date}T12:00:00`);
            return (
              <div className="transaction-row" key={t.id}>
                <div className="transaction-description">
                  <span
                    className={`transaction-icon ${t.kind === "income" ? "income-icon" : ""}`}
                    style={
                      goal
                        ? { background: goal.background, color: goal.color }
                        : undefined
                    }
                  >
                    {t.kind === "income" ? (
                      <ArrowDownLeft size={20} />
                    ) : goal ? (
                      <GoalIcon goal={goal.id} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </span>
                  <div>
                    <button
                      className="transaction-name"
                      disabled={props.busy}
                      onClick={() => onEdit(t)}
                    >
                      {t.description}
                    </button>
                    <div className="transaction-person">
                      {props.members.find((member) => member.id === t.memberId)
                        ?.name ?? "Pessoa do casal"}
                      {" · "}
                      {props.accounts.find(
                        (account) => account.id === t.accountId,
                      )?.name ?? "Sem conta"}
                    </div>
                    <div className="row-tags">
                      {t.tags.length ? (
                        t.tags.map((tag) => (
                          <button key={tag} onClick={() => onTag(tag)}>
                            #{tag}
                          </button>
                        ))
                      ) : (
                        <span>Sem tags</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="transaction-goal">
                  {goal ? (
                    <span
                      className="goal-badge"
                      style={{ background: goal.background, color: goal.color }}
                    >
                      <span
                        className="color-dot"
                        style={{ background: goal.color }}
                      />
                      {goal.name}
                    </span>
                  ) : (
                    <span className="income-label">Receita</span>
                  )}
                </div>
                <time className="transaction-date" dateTime={t.date}>
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })
                    .format(date)
                    .replace(" de ", " ")
                    .replace(".", "")}
                </time>
                <span
                  className={`transaction-value ${t.kind === "income" ? "positive" : "negative"}`}
                >
                  {hidden
                    ? "R$ ••••"
                    : `${t.kind === "income" ? "+" : "−"} ${money(t.amount)}`}
                </span>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    disabled={props.busy}
                    aria-label={`Editar ${t.description}`}
                    onClick={() => onEdit(t)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button delete-button"
                    disabled={props.busy}
                    aria-label={`Excluir ${t.description}`}
                    onClick={() => onDelete(t)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Search size={25} strokeWidth={1.5} />
          </div>
          <h3>
            {activeFilters
              ? "Nenhuma transação encontrada."
              : "Nenhuma transação neste mês."}
          </h3>
          <p>
            {activeFilters
              ? "Ajuste a busca ou os filtros."
              : "Adicione uma receita ou despesa para começar."}
          </p>
          {activeFilters ? (
            <button
              className="secondary-button"
              onClick={() => {
                onQuery("");
                onGoal("all");
                onTag("");
                onKind("all");
              }}
            >
              Limpar filtros
            </button>
          ) : (
            <button className="primary-button" onClick={onAdd}>
              Adicionar primeira transação
            </button>
          )}
        </div>
      )}
      {shown.length > 0 && (
        <div className="table-footer">
          <span>
            {compact && filtered.length > shown.length
              ? `${shown.length} de ${filtered.length} transações neste mês`
              : `${filtered.length} ${filtered.length === 1 ? "transação neste mês" : "transações neste mês"}`}
          </span>
        </div>
      )}
    </section>
  );
}

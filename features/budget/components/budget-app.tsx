import { DeleteRecurrenceDialog } from "./delete-recurrence-dialog";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/features/theme";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Leaf,
  Plus,
  ReceiptText,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useBudget, type BudgetController } from "../hooks/use-budget";
import {
  localDate,
  money,
  shiftMonth,
  summarize,
  planGoals,
} from "../services/budget";
import type { GoalId, Transaction, View } from "../types";
import { GoalPercentagesDialog } from "./goal-percentages-dialog";
import { AppFooter } from "./app-footer";
import { AccountGate } from "./account-gate";
import { CoupleDialog } from "./couple-dialog";
import { FinancialHistory } from "./financial-history";
import { ExpenseCharts } from "./expense-charts";
import { Distribution } from "./distribution";
import { GoalIcon } from "./goal-icon";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionList } from "./transaction-list";

const navigation = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "goals", label: "Metas", icon: Target },
] satisfies { id: View; label: string; icon: typeof LayoutGrid }[];

export function BudgetApp() {
  const budget = useBudget();
  if (
    !budget.ready ||
    budget.accessToken ||
    !budget.user?.name ||
    !budget.household
  )
    return <AccountGate budget={budget} />;
  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
    />
  );
}
function BudgetWorkspace({ budget }: { budget: BudgetController }) {
  const memberCount = budget.household?.members.length ?? 0;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;
  const [memberFilter, setMemberFilter] = useState("all");
  const [coupleOpen, setCoupleOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [view, setView] = useState<View>("overview");
  const [hidden, setHidden] = useState(false);
  const [dialog, setDialog] = useState<{
    transaction: Transaction | null;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [goalFilter, setGoalFilter] = useState<GoalId | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [notice, setNotice] = useState<{
    message: string;
    undo?: Transaction;
  } | null>(null);
  const [editingPercentages, setEditingPercentages] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setMonth(localDate().slice(0, 7));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const monthly = budget.state.transactions.filter(
    (t) =>
      t.date.startsWith(month) &&
      (memberFilter === "all" || t.memberId === memberFilter),
  );
  const summary = summarize(monthly);
  const members = budget.household?.members ?? [];
  const ownMember = members.find((member) => member.id === budget.user?.id);
  const plans = planGoals(
    monthly,
    members.filter(
      (member) => memberFilter === "all" || member.id === memberFilter,
    ),
  );
  const allTags = [
    ...new Set(budget.state.transactions.flatMap((t) => t.tags)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const displayMoney = (value: number) => (hidden ? "R$ ••••" : money(value));

  function navigate(next: View) {
    setView(next);
    setQuery("");
    setGoalFilter("all");
    setTagFilter("");
    setKindFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function filterGoal(id: GoalId) {
    navigate("transactions");
    setGoalFilter(id);
  }

  async function save(transaction: Transaction, occurrences = 1) {
    if (!(await budget.saveTransaction(transaction, occurrences))) return false;
    setMonth(transaction.date.slice(0, 7));
    setNotice({
      message: dialog?.transaction
        ? "Transação atualizada."
        : occurrences > 1
          ? `${occurrences} transações mensais adicionadas.`
          : "Transação adicionada.",
    });
    return true;
  }

  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const following = deleting
    ? budget.state.transactions.filter(
        (item) =>
          item.recurrenceId === deleting.recurrenceId &&
          item.recurrenceIndex !== undefined &&
          deleting.recurrenceIndex !== undefined &&
          item.recurrenceIndex > deleting.recurrenceIndex,
      )
    : [];

  async function remove(transaction: Transaction) {
    if (transaction.recurrenceId) {
      setDeleting(transaction);
      return;
    }
    if (await budget.removeTransaction(transaction))
      setNotice({ message: "Transação excluída.", undo: transaction });
  }

  const titles = {
    overview: {
      title: "Visão geral",
      subtitle: "Saldo, entradas, despesas e metas do mês.",
    },
    transactions: {
      title: "Transações",
      subtitle: "Registre e acompanhe as entradas e despesas do mês.",
    },
    goals: {
      title: "Metas",
      subtitle: "Divida sua renda por meta e compare gasto e planejado.",
    },
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="twogether — início">
          <span className="brand-mark">
            <span />
            <span />
          </span>
          twogether<span className="brand-period">.</span>
        </a>
        <nav className="desktop-navigation" aria-label="Navegação principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              aria-label={item.label}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {view === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <strong>
              {navigation.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <a className="mobile-brand brand" href="/">
            <span className="brand-mark">
              <span />
              <span />
            </span>
            twogether.
          </a>
          <div className="topbar-right">
            <ThemeToggle />
            <button
              className="icon-button visibility-button"
              onClick={() => setHidden(!hidden)}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
            <button
              className="space-button"
              aria-label={`Abrir nosso espaço: ${memberLabel}`}
              title={`Nosso espaço: ${memberLabel}`}
              onClick={() => setCoupleOpen(true)}
            >
              <UsersRound size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="space-button-label">Nosso espaço</span>
              <span className="space-member-count">{memberLabel}</span>
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <h1>{titles[view].title}</h1>
              <p>{titles[view].subtitle}</p>
            </div>
            <button
              className="primary-button add-transaction"
              disabled={budget.busy}
              onClick={() => setDialog({ transaction: null })}
            >
              <Plus size={19} /> Nova transação
            </button>
          </div>
          <div className="month-row">
            <div className="month-picker">
              <button
                className="icon-button"
                aria-label="Mês anterior"
                disabled={!month}
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft size={17} />
              </button>
              <input
                className="month-input"
                type="month"
                aria-label="Selecionar mês e ano"
                value={month}
                required
                onChange={(event) => {
                  if (
                    event.currentTarget.validity.valid &&
                    event.currentTarget.value
                  ) {
                    setMonth(event.currentTarget.value);
                  }
                }}
              />
              <button
                className="icon-button"
                aria-label="Próximo mês"
                disabled={!month}
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            {month && month !== localDate().slice(0, 7) && (
              <button
                className="today-button"
                onClick={() => setMonth(localDate().slice(0, 7))}
              >
                Voltar para este mês
              </button>
            )}
          </div>
          <div className="couple-toolbar">
            <div className="person-filter" aria-label="Filtrar por pessoa">
              <button
                aria-pressed={memberFilter === "all"}
                className={memberFilter === "all" ? "active" : ""}
                onClick={() => setMemberFilter("all")}
              >
                Nós
              </button>
              {[...(budget.household?.members ?? [])]
                .sort(
                  (a, b) =>
                    Number(b.id === budget.user?.id) -
                    Number(a.id === budget.user?.id),
                )
                .map((member) => (
                  <button
                    key={member.id}
                    aria-pressed={memberFilter === member.id}
                    className={memberFilter === member.id ? "active" : ""}
                    onClick={() => setMemberFilter(member.id)}
                  >
                    {member.id === budget.user?.id ? "Eu" : member.name}
                  </button>
                ))}
            </div>
          </div>
          <p className="filter-explanation">
            {memberFilter === "all"
              ? "O planejado soma as metas individuais de cada pessoa."
              : "Renda, gastos e metas da pessoa selecionada."}
          </p>
          {budget.error && (
            <div role="alert" className="storage-error">
              {budget.error}
            </div>
          )}
          {!budget.ready ? (
            <div className="loading-state" aria-live="polite">
              Carregando orçamento…
            </div>
          ) : (
            <>
              {view === "overview" && (
                <section className="overview-grid" aria-label="Resumo mensal">
                  <div className="balance-card">
                    <div className="balance-top">
                      <span>
                        {memberFilter === "all"
                          ? "Nosso saldo do mês"
                          : "Saldo desta pessoa"}
                      </span>
                      <span className="balance-symbol">
                        <Leaf size={19} strokeWidth={1.4} />
                      </span>
                    </div>
                    <div className="balance-amount">
                      {displayMoney(summary.balance)}
                    </div>
                    <div className="balance-caption">
                      <span className="balance-dot" />
                      {summary.balance < 0
                        ? "As despesas superam as entradas neste mês."
                        : summary.income
                          ? "Saldo = entradas - despesas."
                          : "Nenhuma entrada registrada neste mês."}
                    </div>
                    <div className="balance-divider" />
                    <div className="balance-bottom">
                      <div>
                        <span>
                          <span className="money-icon">
                            <ArrowDownLeft size={14} />
                          </span>{" "}
                          Entradas
                        </span>
                        <strong>{displayMoney(summary.income)}</strong>
                      </div>
                      <div>
                        <span>
                          <span className="money-icon">
                            <ArrowUpRight size={14} />
                          </span>{" "}
                          Saídas
                        </span>
                        <strong>{displayMoney(summary.expenses)}</strong>
                      </div>
                      <div className="balance-decoration" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                  <Distribution transactions={monthly} hidden={hidden} />
                </section>
              )}
              {view === "overview" && month && (
                <ExpenseCharts
                  transactions={monthly}
                  month={month}
                  hidden={hidden}
                />
              )}
              {view === "overview" && month && (
                <FinancialHistory
                  transactions={budget.state.transactions.filter((t) => memberFilter === "all" || t.memberId === memberFilter)}
                  month={month}
                  hidden={hidden}
                />
              )}
              {(view === "overview" || view === "goals") && (
                <section
                  className="goals-section"
                  aria-labelledby="goals-title"
                >
                  <div className="section-heading">
                    <div>
                      <h2 id="goals-title">Metas do orçamento</h2>
                    </div>
                    {(memberFilter === "all" ||
                      memberFilter === budget.user?.id) && (
                      <button
                        className="text-button"
                        disabled={budget.busy}
                        onClick={() =>
                          setEditingPercentages(
                            ownMember?.percentagesRevision ?? 0,
                          )
                        }
                      >
                        Editar meus percentuais
                      </button>
                    )}
                  </div>
                  <div
                    className={`goals-grid ${view === "goals" ? "expanded-goals" : ""}`}
                  >
                    {summary.goals.map((goal) => {
                      const plan = plans.find(
                        (item) => item.id === goal.id,
                      ) ?? { planned: 0, percentage: null };
                      return (
                        <button
                          key={goal.id}
                          className="goal-card"
                          style={
                            {
                              "--goal-color": goal.color,
                              "--goal-bg": goal.background,
                            } as React.CSSProperties
                          }
                          onClick={() => filterGoal(goal.id)}
                        >
                          <div className="goal-card-top">
                            <span className="goal-icon">
                              <GoalIcon goal={goal.id} size={21} />
                            </span>
                            <span className="goal-number">
                              {plan.percentage === null
                                ? "—"
                                : `${plan.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                            </span>
                          </div>
                          <h3>{goal.name}</h3>
                          <strong>{displayMoney(goal.amount)}</strong>
                          <p className="goal-budget">
                            de {displayMoney(plan.planned)} planejados
                          </p>
                          <div className="goal-card-foot">
                            <span>
                              {goal.count}{" "}
                              {goal.count === 1 ? "transação" : "transações"}
                            </span>
                            <ArrowUpRight size={16} />
                          </div>
                          <div className="goal-bar">
                            <span
                              style={{
                                width: hidden
                                  ? "0%"
                                  : `${plan.planned > 0 ? Math.min(100, (goal.amount / plan.planned) * 100) : goal.amount > 0 ? 100 : 0}%`,
                              }}
                            />
                          </div>
                          {view === "goals" && (
                            <p className="goal-description">
                              {goal.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
              {(view === "overview" || view === "transactions") && (
                <TransactionList
                  transactions={monthly}
                  members={budget.household?.members ?? []}
                  busy={budget.busy}
                  hidden={hidden}
                  query={query}
                  goalFilter={goalFilter}
                  tagFilter={tagFilter}
                  kindFilter={kindFilter}
                  onQuery={setQuery}
                  onGoal={setGoalFilter}
                  onTag={(tag) => {
                    setTagFilter(tag);
                    setView("transactions");
                  }}
                  onKind={setKindFilter}
                  onEdit={(transaction) => setDialog({ transaction })}
                  onDelete={remove}
                  onAdd={() => setDialog({ transaction: null })}
                  compact={view === "overview"}
                  onViewAll={() => navigate("transactions")}
                />
              )}
            </>
          )}
        </main>
        <AppFooter />
      </div>
      <nav className="mobile-navigation" aria-label="Navegação mobile">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={21} strokeWidth={1.7} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {editingPercentages !== null && (
        <GoalPercentagesDialog
          percentages={budget.state.percentages}
          onClose={() => setEditingPercentages(null)}
          error={budget.error}
          onSave={async (values) => {
            if (!(await budget.savePercentages(values, editingPercentages)))
              return false;
            setNotice({ message: "Percentuais atualizados." });
            return true;
          }}
        />
      )}
      {dialog && (
        <TransactionDialog
          transaction={dialog.transaction}
          defaultDate={
            month === localDate().slice(0, 7) ? localDate() : `${month}-01`
          }
          existingTags={allTags}
          members={budget.household?.members ?? []}
          currentUserId={budget.user?.id ?? ""}
          serverError={budget.error}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      {deleting && (
        <DeleteRecurrenceDialog
          transaction={deleting}
          count={following.length + 1}
          busy={budget.busy}
          error={budget.error}
          onClose={() => setDeleting(null)}
          onDelete={async (includeFollowing) => {
            if (
              await budget.removeTransaction(
                deleting,
                includeFollowing ? following : undefined,
              )
            ) {
              setNotice(
                includeFollowing
                  ? { message: `${following.length + 1} transações excluídas.` }
                  : { message: "Transação excluída.", undo: deleting },
              );
              setDeleting(null);
            }
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              onClick={async () => {
                if (notice.undo && (await budget.restore(notice.undo)))
                  setNotice({ message: "Alteração desfeita." });
              }}
            >
              Desfazer
            </button>
          )}
          <button
            className="toast-close"
            aria-label="Fechar aviso"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {coupleOpen && (
        <CoupleDialog budget={budget} onClose={() => setCoupleOpen(false)} />
      )}
    </div>
  );
}

import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Landmark,
  LayoutGrid,
  Plus,
  ReceiptText,
  Target,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { useBudget, type BudgetController } from "@/features/budget/hooks/use-budget";
import { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import {
  localDate,
  money,
  shiftMonth,
  summarize,
  planGoals,
} from "@/features/budget/services/budget";
import type {
  BankAccount,
  Transaction,
  View,
} from "@/features/budget/types";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog";
import { AppFooter } from "@/features/budget/components/app-footer";
import { AccountGate } from "@/features/budget/components/account-gate";
import { CoupleDialog } from "@/features/budget/components/couple-dialog";
import { FinancialHistory } from "@/features/budget/components/financial-history";
import { ExpenseCharts } from "@/features/budget/components/expense-charts";
import { Distribution } from "@/features/budget/components/distribution";
import { GoalIcon } from "@/features/budget/components/goal-icon";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog";
import { TransactionList } from "@/features/budget/components/transaction-list";
import styles from "@/features/budget/components/budget-app.module.css";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import { AccountList } from "@/features/budget/components/account-list";
import { withView } from "@/features/budget/search";
import { Brand } from "@/components/ui/brand/brand";
import { Button } from "@/components/ui/button/button";
import { OverviewGrid, SectionHeading } from "@/components/ui/panel/panel";

const navigation = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "goals", label: "Metas", icon: Target },
] satisfies { id: View; label: string; icon: typeof LayoutGrid }[];

export function BudgetApp() {
  const budget = useBudget();
  if (!budget.user?.name || !budget.household)
    return <AccountGate budget={budget} />;
  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
    />
  );
}

function BudgetWorkspace({ budget }: { budget: BudgetController }) {
  const {
    view,
    month: searchMonth,
    memberFilter,
    query,
    goalFilter,
    tagFilter,
    kindFilter,
    setMonth,
    setMemberFilter,
    setQuery,
    setGoalFilter,
    setKindFilter,
    setTag,
    setView,
    filterGoal,
  } = useBudgetSearch();
  const memberCount = budget.household?.members.length ?? 0;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;
  const [fallbackMonth, setFallbackMonth] = useState("");
  const month = searchMonth ?? fallbackMonth;
  const [coupleOpen, setCoupleOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dialog, setDialog] = useState<{
    transaction: Transaction | null;
  } | null>(null);
  const [accountDialog, setAccountDialog] = useState<{
    account: BankAccount | null;
  } | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    undo?: Transaction;
  } | null>(null);
  const [editingPercentages, setEditingPercentages] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setFallbackMonth(localDate().slice(0, 7));
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
  const filterExplanation =
    view === "accounts"
      ? memberFilter === "all"
        ? "O saldo de cada conta inclui as transações de todo o casal."
        : "O saldo de cada conta considera só as transações da pessoa selecionada."
      : memberFilter === "all"
        ? "O planejado soma as metas individuais de cada pessoa."
        : "Renda, gastos e metas da pessoa selecionada.";

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
    accounts: {
      title: "Contas",
      subtitle: "Cadastre as contas e acompanhe o saldo de cada uma.",
    },
    goals: {
      title: "Metas",
      subtitle: "Divida sua renda por meta e compare gasto e planejado.",
    },
  };

  function openTransaction(transaction: Transaction | null) {
    if (!transaction && budget.state.accounts.length === 0) {
      setNotice({
        message: "Cadastre uma conta para lançar transações.",
      });
      setView("accounts");
      return;
    }
    setDialog({ transaction });
  }

  async function saveAccount(account: BankAccount) {
    if (!(await budget.saveAccount(account))) return false;
    setNotice({
      message: accountDialog?.account ? "Conta atualizada." : "Conta adicionada.",
    });
    return true;
  }

  async function removeAccount(account: BankAccount) {
    if (await budget.removeAccount(account))
      setNotice({ message: "Conta excluída." });
  }

  async function undoNotice() {
    if (notice?.undo && (await budget.restore(notice.undo)))
      setNotice({ message: "Alteração desfeita." });
  }

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Brand
          className={styles.sidebarBrand}
          mark
          aria-label="twogether — início"
        />
        <nav className={styles.desktopNavigation} aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link
              key={item.id}
              to="/"
              search={(prev) => withView(prev, item.id)}
              className={`${styles.navItem} ${view === item.id ? styles.active : ""}`}
              aria-label={item.label}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {view === item.id && <span className={styles.navActiveDot} />}
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.mainShell}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <strong>
              {navigation.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <Brand className={styles.mobileBrand} mark markClassName={styles.mobileMark}>
            twogether.
          </Brand>
          <div className={styles.topbarRight}>
            <ThemeToggle className={styles.topbarTheme} />
            <Button
              variant="icon"
              className={styles.visibilityButton}
              onClick={() => setHidden(!hidden)}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </Button>
            <button
              className={styles.spaceButton}
              aria-label={`Abrir nosso espaço: ${memberLabel}`}
              title={`Nosso espaço: ${memberLabel}`}
              onClick={() => setCoupleOpen(true)}
            >
              <UsersRound size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.spaceButtonLabel}>Nosso espaço</span>
              <span className={styles.spaceMemberCount}>{memberLabel}</span>
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className={styles.pageHeading}>
            <div>
              <h1>{titles[view].title}</h1>
              <p>{titles[view].subtitle}</p>
            </div>
            <Button
              className={styles.addTransaction}
              disabled={budget.busy}
              onClick={() =>
                view === "accounts"
                  ? setAccountDialog({ account: null })
                  : openTransaction(null)
              }
            >
              <Plus size={19} />{" "}
              {view === "accounts" ? "Nova conta" : "Nova transação"}
            </Button>
          </div>
          {view !== "accounts" && (
            <div className={styles.monthRow}>
              <div className={styles.monthPicker}>
                <Button
                  variant="icon"
                  className={styles.monthIcon}
                  aria-label="Mês anterior"
                  disabled={!month}
                  onClick={() => setMonth(shiftMonth(month, -1))}
                >
                  <ChevronLeft size={17} />
                </Button>
                <input
                  className={styles.monthInput}
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
                <Button
                  variant="icon"
                  className={styles.monthIcon}
                  aria-label="Próximo mês"
                  disabled={!month}
                  onClick={() => setMonth(shiftMonth(month, 1))}
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
              {month && month !== localDate().slice(0, 7) && (
                <button
                  className={styles.todayButton}
                  onClick={() => setMonth(localDate().slice(0, 7))}
                >
                  Voltar para este mês
                </button>
              )}
            </div>
          )}
          <div className={styles.coupleToolbar}>
            <div className={styles.personFilter} aria-label="Filtrar por pessoa">
              <button
                aria-pressed={memberFilter === "all"}
                className={memberFilter === "all" ? styles.active : ""}
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
                    className={memberFilter === member.id ? styles.active : ""}
                    onClick={() => setMemberFilter(member.id)}
                  >
                    {member.id === budget.user?.id ? "Eu" : member.name}
                  </button>
                ))}
            </div>
          </div>
          <p className={styles.filterExplanation}>{filterExplanation}</p>
          {budget.error && (
            <div role="alert" className={styles.storageError}>
              {budget.error}
            </div>
          )}
          {view === "accounts" ? (
            <AccountList
              accounts={budget.state.accounts}
              transactions={budget.state.transactions}
              memberFilter={memberFilter}
              busy={budget.busy}
              hidden={hidden}
              onAdd={() => setAccountDialog({ account: null })}
              onEdit={(account) => setAccountDialog({ account })}
              onDelete={(account) => void removeAccount(account)}
            />
          ) : (
            <>
              {view === "overview" && (
                <OverviewGrid aria-label="Resumo mensal">
                  <div
                    className={`${styles.balanceCard} ${summary.balance < 0 ? styles.negative : ""}`}
                  >
                    <div className={styles.balanceTop}>
                      {memberFilter === "all"
                        ? "Nosso saldo do mês"
                        : "Saldo desta pessoa"}
                    </div>
                    <div className={styles.balanceAmount}>
                      {displayMoney(summary.balance)}
                    </div>
                    <div className={styles.balanceCaption}>
                      <span className={styles.balanceDot} />
                      {summary.balance < 0
                        ? "As despesas superam as entradas neste mês."
                        : summary.income
                          ? "Saldo = entradas - despesas."
                          : "Nenhuma entrada registrada neste mês."}
                    </div>
                    <div className={styles.balanceDivider} />
                    <div className={styles.balanceBottom}>
                      <div>
                        <span>
                          <span className={styles.moneyIcon}>
                            <ArrowDownLeft size={14} />
                          </span>{" "}
                          Entradas
                        </span>
                        <strong>{displayMoney(summary.income)}</strong>
                      </div>
                      <div>
                        <span>
                          <span className={styles.moneyIcon}>
                            <ArrowUpRight size={14} />
                          </span>{" "}
                          Saídas
                        </span>
                        <strong>{displayMoney(summary.expenses)}</strong>
                      </div>
                      <div className={styles.balanceDecoration} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                  <Distribution transactions={monthly} hidden={hidden} />
                </OverviewGrid>
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
                  className={styles.goalsSection}
                  aria-labelledby="goals-title"
                >
                  <SectionHeading title="Metas do orçamento" titleId="goals-title">
                    {(memberFilter === "all" ||
                      memberFilter === budget.user?.id) && (
                      <Button
                        variant="text"
                        disabled={budget.busy}
                        onClick={() =>
                          setEditingPercentages(
                            ownMember?.percentagesRevision ?? 0,
                          )
                        }
                      >
                        Editar meus percentuais
                      </Button>
                    )}
                  </SectionHeading>
                  <div
                    className={`${styles.goalsGrid} ${view === "goals" ? styles.expandedGoals : ""}`}
                  >
                    {summary.goals.map((goal) => {
                      const plan = plans.find(
                        (item) => item.id === goal.id,
                      ) ?? { planned: 0, percentage: null };
                      const overBudget = goal.amount > plan.planned;
                      const overage = goal.amount - plan.planned;
                      return (
                        <button
                          key={goal.id}
                          className={`${styles.goalCard} ${overBudget ? styles.overBudget : ""}`}
                          aria-label={`${goal.name}: ${displayMoney(goal.amount)} de ${displayMoney(plan.planned)} planejados${overBudget ? ", acima do planejado" : ""}`}
                          style={
                            {
                              "--goal-color": goal.color,
                              "--goal-bg": goal.background,
                            } as React.CSSProperties
                          }
                          onClick={() => filterGoal(goal.id)}
                        >
                          <div className={styles.goalCardTop}>
                            <span className={styles.goalIcon}>
                              <GoalIcon goal={goal.id} size={21} />
                            </span>
                            <span className={styles.goalNumber}>
                              {plan.percentage === null
                                ? "—"
                                : `${plan.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                            </span>
                          </div>
                          <h3>{goal.name}</h3>
                          <strong>{displayMoney(goal.amount)}</strong>
                          <p className={styles.goalBudget}>
                            de {displayMoney(plan.planned)} planejados
                          </p>
                          <div className={styles.goalCardFoot}>
                            <span>
                              {goal.count}{" "}
                              {goal.count === 1 ? "transação" : "transações"}
                            </span>
                            {overBudget ? (
                              <span
                                className={styles.goalStatus}
                                title={
                                  hidden
                                    ? "Acima do planejado"
                                    : `${displayMoney(overage)} acima do planejado`
                                }
                              >
                                <TriangleAlert size={14} />
                                <span>
                                  {hidden
                                    ? "Acima do planejado"
                                    : `${displayMoney(overage)} acima`}
                                </span>
                              </span>
                            ) : (
                              <ArrowUpRight size={16} />
                            )}
                          </div>
                          <div className={styles.goalBar}>
                            <span
                              style={{
                                width: hidden
                                  ? "0%"
                                  : `${plan.planned > 0 ? Math.min(100, (goal.amount / plan.planned) * 100) : goal.amount > 0 ? 100 : 0}%`,
                              }}
                            />
                          </div>
                          {view === "goals" && (
                            <p className={styles.goalDescription}>
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
                  accounts={budget.state.accounts}
                  busy={budget.busy}
                  hidden={hidden}
                  query={query}
                  goalFilter={goalFilter}
                  tagFilter={tagFilter}
                  kindFilter={kindFilter}
                  onQuery={setQuery}
                  onGoal={setGoalFilter}
                  onTag={setTag}
                  onKind={setKindFilter}
                  onEdit={(transaction) => openTransaction(transaction)}
                  onDelete={(transaction) => void remove(transaction)}
                  onAdd={() => openTransaction(null)}
                  compact={view === "overview"}
                  onViewAll={() => setView("transactions")}
                />
              )}
            </>
          )}
        </main>
        <AppFooter className={styles.shellFooter} />
      </div>
      <nav className={styles.mobileNavigation} aria-label="Navegação mobile">
        {navigation.map((item) => (
          <Link
            key={item.id}
            to="/"
            search={(prev) => withView(prev, item.id)}
            className={view === item.id ? styles.active : ""}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <item.icon size={21} strokeWidth={1.7} />
            <span>{item.label}</span>
          </Link>
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
          accounts={budget.state.accounts}
          currentUserId={budget.user?.id ?? ""}
          serverError={budget.error}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      {accountDialog && (
        <AccountDialog
          account={accountDialog.account}
          serverError={budget.error}
          onSave={saveAccount}
          onClose={() => setAccountDialog(null)}
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
        <div className={styles.toast} role="status">
          <Check size={18} />
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              onClick={() => void undoNotice()}
            >
              Desfazer
            </button>
          )}
          <button
            className={styles.toastClose}
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

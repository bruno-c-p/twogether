import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useBudget, type BudgetController } from "../hooks/use-budget";
import {
  localDate,
  shiftMonth,
  summarize,
  planGoals,
} from "../services/budget";
import type {
  BankAccount,
  GoalId,
  SharedSnapshot,
  Transaction,
  TransactionKind,
  View,
} from "../types";
import { GoalPercentagesDialog } from "./goal-percentages-dialog";
import { AppFooter } from "./app-footer";
import { AccountGate } from "./account-gate";
import { CoupleDialog } from "./couple-dialog";
import { FinancialHistory } from "./financial-history";
import { ExpenseCharts } from "./expense-charts";
import { Distribution } from "./distribution";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionList } from "./transaction-list";
import { AccountDialog } from "./account-dialog";
import { AccountList } from "./account-list";
import { DeleteRecurrenceDialog } from "./delete-recurrence-dialog";
import { AppNavigation, MobileNavigation } from "./app-navigation";
import { Topbar } from "./topbar";
import { BalanceCard } from "./balance-card";
import { GoalsSection } from "./goals-section";
import { NoticeToast } from "./notice-toast";

const titles: Record<View, { title: string; subtitle: string }> = {
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

export function BudgetApp({
  initialSnapshot,
}: {
  initialSnapshot: SharedSnapshot;
}) {
  const budget = useBudget(initialSnapshot);
  if (budget.accessToken || !budget.user?.name || !budget.household)
    return <AccountGate budget={budget} />;
  return (
    <BudgetWorkspace
      key={`${budget.household.id}:${budget.user.id}`}
      budget={budget}
    />
  );
}

function BudgetWorkspace({ budget }: { budget: BudgetController }) {
  const search = useSearch({ from: "/" });
  const routeNavigate = useNavigate();
  const memberCount = budget.household?.members.length ?? 0;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;
  const view = search.view ?? "overview";
  const memberFilter = search.member ?? "all";
  const query = search.query ?? "";
  const goalFilter = search.goal ?? "all";
  const tagFilter = search.tag ?? "";
  const kindFilter = search.kind ?? "all";
  const [fallbackMonth, setFallbackMonth] = useState("");
  const month = search.month ?? fallbackMonth;
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
  const [deleting, setDeleting] = useState<Transaction | null>(null);

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
  const filterExplanation =
    view === "accounts"
      ? memberFilter === "all"
        ? "O saldo de cada conta inclui as transações de todo o casal."
        : "O saldo de cada conta considera só as transações da pessoa selecionada."
      : memberFilter === "all"
        ? "O planejado soma as metas individuais de cada pessoa."
        : "Renda, gastos e metas da pessoa selecionada.";
  const following = deleting
    ? budget.state.transactions.filter(
        (item) =>
          item.recurrenceId === deleting.recurrenceId &&
          item.recurrenceIndex !== undefined &&
          deleting.recurrenceIndex !== undefined &&
          item.recurrenceIndex > deleting.recurrenceIndex,
      )
    : [];

  function updateSearch(
    next: (prev: typeof search) => typeof search,
    replace = false,
  ) {
    void routeNavigate({ to: "/", search: next, replace });
  }

  function setMonth(value: string) {
    updateSearch((prev) => ({ ...prev, month: value }));
  }

  function setMemberFilter(member: string) {
    updateSearch((prev) => ({
      ...prev,
      member: member === "all" ? undefined : member,
    }));
  }

  function setQuery(value: string) {
    updateSearch((prev) => ({ ...prev, query: value || undefined }), true);
  }

  function setGoalFilter(goal: GoalId | "all") {
    updateSearch((prev) => ({
      ...prev,
      goal: goal === "all" ? undefined : goal,
    }));
  }

  function setKindFilter(kind: TransactionKind | "all") {
    updateSearch((prev) => ({
      ...prev,
      kind: kind === "all" ? undefined : kind,
    }));
  }

  function navigate(next: View) {
    updateSearch((prev) => ({
      ...prev,
      view: next,
      query: undefined,
      goal: undefined,
      tag: undefined,
      kind: undefined,
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function filterGoal(id: GoalId) {
    updateSearch((prev) => ({
      ...prev,
      view: "transactions",
      goal: id,
      query: undefined,
      tag: undefined,
      kind: undefined,
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function remove(transaction: Transaction) {
    if (transaction.recurrenceId) {
      setDeleting(transaction);
      return;
    }
    if (await budget.removeTransaction(transaction))
      setNotice({ message: "Transação excluída.", undo: transaction });
  }

  function openTransaction(transaction: Transaction | null) {
    if (!transaction && budget.state.accounts.length === 0) {
      setNotice({
        message: "Cadastre uma conta para lançar transações.",
      });
      navigate("accounts");
      return;
    }
    setDialog({ transaction });
  }

  async function saveAccount(account: BankAccount) {
    if (!(await budget.saveAccount(account))) return false;
    setNotice({
      message: accountDialog?.account
        ? "Conta atualizada."
        : "Conta adicionada.",
    });
    return true;
  }

  async function removeAccount(account: BankAccount) {
    if (await budget.removeAccount(account))
      setNotice({ message: "Conta excluída." });
  }

  return (
    <div className="app-shell">
      <AppNavigation view={view} onNavigate={navigate} />
      <div className="main-shell">
        <Topbar
          view={view}
          hidden={hidden}
          memberLabel={memberLabel}
          onToggleHidden={() => setHidden(!hidden)}
          onOpenCouple={() => setCoupleOpen(true)}
        />
        <main id="main-content">
          <div className="page-heading">
            <div>
              <h1>{titles[view].title}</h1>
              <p>{titles[view].subtitle}</p>
            </div>
            <button
              className="primary-button add-transaction"
              disabled={budget.busy}
              onClick={() =>
                view === "accounts"
                  ? setAccountDialog({ account: null })
                  : openTransaction(null)
              }
            >
              <Plus size={19} />{" "}
              {view === "accounts" ? "Nova conta" : "Nova transação"}
            </button>
          </div>
          {view !== "accounts" && (
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
          )}
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
          <p className="filter-explanation">{filterExplanation}</p>
          {budget.error && (
            <div role="alert" className="storage-error">
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
              onDelete={removeAccount}
            />
          ) : (
            <>
              {view === "overview" && (
                <section className="overview-grid" aria-label="Resumo mensal">
                  <BalanceCard
                    balance={summary.balance}
                    income={summary.income}
                    expenses={summary.expenses}
                    filtered={memberFilter !== "all"}
                    hidden={hidden}
                  />
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
                  transactions={budget.state.transactions.filter(
                    (t) =>
                      memberFilter === "all" || t.memberId === memberFilter,
                  )}
                  month={month}
                  hidden={hidden}
                />
              )}
              {(view === "overview" || view === "goals") && (
                <GoalsSection
                  expanded={view === "goals"}
                  goals={summary.goals}
                  plans={plans}
                  hidden={hidden}
                  canEdit={
                    memberFilter === "all" || memberFilter === budget.user?.id
                  }
                  busy={budget.busy}
                  onEditPercentages={() =>
                    setEditingPercentages(ownMember?.percentagesRevision ?? 0)
                  }
                  onFilterGoal={filterGoal}
                />
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
                  onTag={(tag) =>
                    updateSearch((prev) => ({
                      ...prev,
                      view: "transactions",
                      tag: tag || undefined,
                    }))
                  }
                  onKind={setKindFilter}
                  onEdit={(transaction) => openTransaction(transaction)}
                  onDelete={remove}
                  onAdd={() => openTransaction(null)}
                  compact={view === "overview"}
                  onViewAll={() => navigate("transactions")}
                />
              )}
            </>
          )}
        </main>
        <AppFooter />
      </div>
      <MobileNavigation view={view} onNavigate={navigate} />
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
        <NoticeToast
          message={notice.message}
          canUndo={!!notice.undo}
          onUndo={async () => {
            if (notice.undo && (await budget.restore(notice.undo)))
              setNotice({ message: "Alteração desfeita." });
          }}
          onClose={() => setNotice(null)}
        />
      )}
      {coupleOpen && (
        <CoupleDialog budget={budget} onClose={() => setCoupleOpen(false)} />
      )}
    </div>
  );
}

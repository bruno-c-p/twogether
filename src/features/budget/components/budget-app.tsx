import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  useBudget,
  type BudgetController,
} from "@/features/budget/hooks/use-budget";
import { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import {
  localDate,
  money,
  shiftMonth,
  summarize,
  planGoals,
} from "@/features/budget/services/budget";
import type { BankAccount, Transaction } from "@/features/budget/types";
import { WORKSPACE_TITLES } from "@/features/budget/constants";
import { AccountList } from "@/features/budget/components/account-list";
import { GoalsSection } from "@/features/budget/components/goals-section";
import { NoticeToast, useNotice } from "@/features/budget/components/notice";
import { Overview } from "@/features/budget/components/overview";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { TransactionList } from "@/features/budget/components/transaction-list";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell";
import styles from "@/features/budget/components/budget-app.module.css";
import { Button } from "@/components/ui/button/button";

export function BudgetApp() {
  const budget = useBudget();
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
  const memberCount = budget.household.members.length;
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
  const { notice, setNotice } = useNotice();
  const [editingPercentages, setEditingPercentages] = useState<number | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  useEffect(() => {
    setFallbackMonth(localDate().slice(0, 7));
  }, []);

  const members = budget.household.members;
  const monthly = useMemo(
    () =>
      budget.state.transactions.filter(
        (t) =>
          t.date.startsWith(month) &&
          (memberFilter === "all" || t.memberId === memberFilter),
      ),
    [budget.state.transactions, month, memberFilter],
  );
  const summary = useMemo(() => summarize(monthly), [monthly]);
  const ownMember = members.find((member) => member.id === budget.user.id);
  const plans = useMemo(
    () =>
      planGoals(
        monthly,
        members.filter(
          (member) => memberFilter === "all" || member.id === memberFilter,
        ),
      ),
    [monthly, members, memberFilter],
  );
  const allTags = useMemo(
    () =>
      [...new Set(budget.state.transactions.flatMap((t) => t.tags))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [budget.state.transactions],
  );
  const historyTransactions = useMemo(
    () =>
      budget.state.transactions.filter(
        (t) => memberFilter === "all" || t.memberId === memberFilter,
      ),
    [budget.state.transactions, memberFilter],
  );
  const following = useMemo(
    () =>
      deleting
        ? budget.state.transactions.filter(
            (item) =>
              item.recurrenceId === deleting.recurrenceId &&
              item.recurrenceIndex !== undefined &&
              deleting.recurrenceIndex !== undefined &&
              item.recurrenceIndex > deleting.recurrenceIndex,
          )
        : [],
    [budget.state.transactions, deleting],
  );
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
      setView("accounts");
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

  async function undoNotice() {
    if (notice?.undo && (await budget.restore(notice.undo)))
      setNotice({ message: "Alteração desfeita." });
  }

  return (
    <WorkspaceShell
      view={view}
      memberLabel={memberLabel}
      hidden={hidden}
      onToggleHidden={() => setHidden(!hidden)}
      onOpenCouple={() => setCoupleOpen(true)}
      overlays={
        <>
          <TransactionFlows
            budget={budget}
            month={month}
            allTags={allTags}
            dialog={dialog}
            accountDialog={accountDialog}
            deleting={deleting}
            following={following}
            editingPercentages={editingPercentages}
            coupleOpen={coupleOpen}
            onSave={save}
            onSaveAccount={saveAccount}
            onCloseDialog={() => setDialog(null)}
            onCloseAccount={() => setAccountDialog(null)}
            onCloseDeleting={() => setDeleting(null)}
            onClosePercentages={() => setEditingPercentages(null)}
            onCloseCouple={() => setCoupleOpen(false)}
            onNotice={setNotice}
          />
          {notice && (
            <NoticeToast
              notice={notice}
              onUndo={() => void undoNotice()}
              onDismiss={() => setNotice(null)}
            />
          )}
        </>
      }
    >
      <div className={styles.pageHeading}>
        <div>
          <h1>{WORKSPACE_TITLES[view].title}</h1>
          <p>{WORKSPACE_TITLES[view].subtitle}</p>
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
          {[...members]
            .sort(
              (a, b) =>
                Number(b.id === budget.user.id) -
                Number(a.id === budget.user.id),
            )
            .map((member) => (
              <button
                key={member.id}
                aria-pressed={memberFilter === member.id}
                className={memberFilter === member.id ? styles.active : ""}
                onClick={() => setMemberFilter(member.id)}
              >
                {member.id === budget.user.id ? "Eu" : member.name}
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
            <Overview
              monthly={monthly}
              historyTransactions={historyTransactions}
              month={month}
              memberFilter={memberFilter}
              hidden={hidden}
              displayMoney={displayMoney}
              summary={summary}
            />
          )}
          {(view === "overview" || view === "goals") && (
            <GoalsSection
              view={view}
              summary={summary}
              plans={plans}
              hidden={hidden}
              displayMoney={displayMoney}
              memberFilter={memberFilter}
              userId={budget.user.id}
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
              members={members}
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
    </WorkspaceShell>
  );
}

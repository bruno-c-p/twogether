import { useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  deleteAccount,
  deleteTransaction,
  restoreTransaction,
  saveAccount,
  savePercentages,
  saveTransaction,
} from "@/features/budget/actions";
import {
  useBudget,
  type BudgetController,
} from "@/features/budget/hooks/use-budget";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { useBudgetSearch } from "@/features/budget/hooks/use-budget-search";
import {
  currentMonth,
  money,
  shiftMonth,
} from "@/features/budget/domain/format";
import { monthSchema } from "@/features/budget/domain/schemas";
import {
  optimisticDelete,
  optimisticRestore,
  optimisticSave,
} from "@/features/budget/workspace";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import type {
  BankAccount,
  GoalPercentages,
  Transaction,
} from "@/features/budget/domain/types";
import { WORKSPACE_TITLES } from "@/features/budget/constants";
import { AccountList } from "@/features/budget/components/account-list";
import { GoalsSection } from "@/features/budget/components/goals-section/goals-section";
import { MemberFilter } from "@/features/budget/components/member-filter/member-filter";
import { NoticeToast, useNotice } from "@/features/budget/components/notice";
import { Overview } from "@/features/budget/components/overview/overview";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { TransactionList } from "@/features/budget/components/transaction-list/transaction-list";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell/workspace-shell";
import styles from "@/features/budget/components/budget-app/budget-app.module.css";
import { Button } from "@/components/ui/button";

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
  const posthog = usePostHog();
  const saveTx = useMutation(
    (data: { transaction: Transaction; occurrences?: number }) =>
      saveTransaction({ data }),
    optimisticSave,
  );
  const deleteTx = useMutation(
    (data: {
      id: string;
      revision: number;
      following?: { id: string; revision: number }[];
    }) => deleteTransaction({ data }),
    optimisticDelete,
  );
  const restoreTx = useMutation(
    (data: { id: string; revision: number; transaction: Transaction }) =>
      restoreTransaction({ data: { id: data.id, revision: data.revision } }),
    (snapshot, data) => optimisticRestore(snapshot, data.transaction),
  );
  const saveAcc = useMutation((account: BankAccount) =>
    saveAccount({ data: { account } }),
  );
  const deleteAcc = useMutation((data: { id: string; revision: number }) =>
    deleteAccount({ data }),
  );
  const savePct = useMutation(
    (data: { percentages: GoalPercentages; revision: number }) =>
      savePercentages({ data }),
  );
  const busy =
    saveTx.pending ||
    deleteTx.pending ||
    restoreTx.pending ||
    saveAcc.pending ||
    deleteAcc.pending ||
    savePct.pending;
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
  const month = searchMonth ?? currentMonth();
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
  const listError =
    deleteAcc.error || restoreTx.error || (!deleting ? deleteTx.error : "");

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
    const isUpdate = Boolean(dialog?.transaction);
    if (!(await saveTx.run({ transaction, occurrences }))) return false;
    posthog.capture(isUpdate ? "transaction_updated" : "transaction_created", {
      transaction_kind: transaction.kind,
      has_goal: Boolean(transaction.goal),
      is_recurring: occurrences > 1,
      occurrence_count: occurrences,
    });
    setMonth(transaction.date.slice(0, 7));
    setNotice({
      message: isUpdate
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
    if (
      await deleteTx.run({
        id: transaction.id,
        revision: transaction.revision ?? 0,
      })
    ) {
      posthog.capture("transaction_deleted", { delete_scope: "single" });
      setNotice({ message: "Transação excluída.", undo: transaction });
    }
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

  async function saveAccountRecord(account: BankAccount) {
    const isUpdate = Boolean(accountDialog?.account);
    if (!(await saveAcc.run(account))) return false;
    posthog.capture(isUpdate ? "account_updated" : "account_created");
    setNotice({
      message: isUpdate ? "Conta atualizada." : "Conta adicionada.",
    });
    return true;
  }

  async function removeAccount(account: BankAccount) {
    if (
      await deleteAcc.run({
        id: account.id,
        revision: account.revision ?? 0,
      })
    ) {
      posthog.capture("account_deleted");
      setNotice({ message: "Conta excluída." });
    }
  }

  async function undoNotice() {
    if (
      notice?.undo &&
      (await restoreTx.run({
        id: notice.undo.id,
        revision: (notice.undo.revision ?? 0) + 1,
        transaction: notice.undo,
      }))
    )
      setNotice({ message: "Alteração desfeita." });
  }

  async function saveGoalPercentages(values: GoalPercentages) {
    if (editingPercentages === null) return false;
    if (
      !(await savePct.run({
        percentages: values,
        revision: editingPercentages,
      }))
    )
      return false;
    posthog.capture("goal_percentages_saved");
    setNotice({ message: "Percentuais atualizados." });
    return true;
  }

  async function deleteRecurring(includeFollowing: boolean) {
    if (!deleting) return;
    if (
      await deleteTx.run({
        id: deleting.id,
        revision: deleting.revision ?? 0,
        following: includeFollowing
          ? following.map((item) => ({
              id: item.id,
              revision: item.revision ?? 0,
            }))
          : undefined,
      })
    ) {
      posthog.capture("transaction_deleted", {
        delete_scope: includeFollowing ? "following" : "single",
        deleted_count: includeFollowing ? following.length + 1 : 1,
      });
      setNotice(
        includeFollowing
          ? { message: `${following.length + 1} transações excluídas.` }
          : { message: "Transação excluída.", undo: deleting },
      );
      setDeleting(null);
    }
  }

  return (
    <WorkspaceShell
      view={view}
      memberLabel={memberLabel}
      hidden={hidden}
      onToggleHidden={() => setHidden(!hidden)}
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
            saveError={saveTx.error}
            accountError={saveAcc.error}
            deleteError={deleteTx.error}
            percentagesError={savePct.error}
            deleteBusy={deleteTx.pending}
            onSave={save}
            onSaveAccount={saveAccountRecord}
            onSavePercentages={saveGoalPercentages}
            onDelete={deleteRecurring}
            onCloseDialog={() => setDialog(null)}
            onCloseAccount={() => setAccountDialog(null)}
            onCloseDeleting={() => setDeleting(null)}
            onClosePercentages={() => setEditingPercentages(null)}
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
          disabled={busy}
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
                const next = event.currentTarget.value;
                if (monthSchema.safeParse(next).success) setMonth(next);
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
          {month !== currentMonth() && (
            <button
              className={styles.todayButton}
              onClick={() => setMonth(currentMonth())}
            >
              Voltar para este mês
            </button>
          )}
        </div>
      )}
      <div className={styles.coupleToolbar}>
        <MemberFilter
          members={members}
          userId={budget.user.id}
          value={memberFilter}
          onChange={setMemberFilter}
        />
      </div>
      <p className={styles.filterExplanation}>{filterExplanation}</p>
      {(budget.syncError || listError) && (
        <div role="alert" className={styles.storageError}>
          {budget.syncError || listError}
        </div>
      )}
      {view === "accounts" ? (
        <AccountList
          accounts={budget.state.accounts}
          transactions={budget.state.transactions}
          memberFilter={memberFilter}
          busy={busy}
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
              busy={busy}
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
              busy={busy}
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

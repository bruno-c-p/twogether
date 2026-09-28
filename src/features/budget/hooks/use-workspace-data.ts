import { useMemo } from "react";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import { splitDebt, usTransactions } from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";

// "Nós" shows the couple's shared view (repayments between the two
// net out); a person filter shows that person's own transactions.
function viewFor(transactions: Transaction[], memberFilter: string) {
  if (memberFilter === "all") return usTransactions(transactions);

  return transactions.filter((t) => t.memberId === memberFilter);
}

function laterOccurrences(
  transactions: Transaction[],
  deleting: Transaction | null,
) {
  const index = deleting?.recurrenceIndex;

  if (!deleting || index === undefined) return [];

  return transactions.filter(
    (item) =>
      item.recurrenceId === deleting.recurrenceId &&
      item.recurrenceIndex !== undefined &&
      item.recurrenceIndex > index,
  );
}

export function useWorkspaceData(
  budget: BudgetController,
  month: string,
  memberFilter: string,
  deleting: Transaction | null,
) {
  const { transactions } = budget.state;
  const members = budget.household.members;

  const historyTransactions = useMemo(
    () => viewFor(transactions, memberFilter),
    [transactions, memberFilter],
  );

  const monthly = useMemo(
    () => historyTransactions.filter((t) => t.date.startsWith(month)),
    [historyTransactions, month],
  );

  const summary = useMemo(() => summarize(monthly), [monthly]);

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
      [...new Set(transactions.flatMap((t) => t.tags))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [transactions],
  );

  const following = useMemo(
    () => laterOccurrences(transactions, deleting),
    [transactions, deleting],
  );

  const debt = useMemo(
    () => splitDebt(transactions, budget.user.id),
    [transactions, budget.user.id],
  );

  const partner =
    members.length === 2
      ? members.find((member) => member.id !== budget.user.id)
      : undefined;

  return {
    monthly,
    historyTransactions,
    summary,
    plans,
    allTags,
    following,
    debt,
    partner,
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;

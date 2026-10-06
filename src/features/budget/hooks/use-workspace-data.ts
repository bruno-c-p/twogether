import { useMemo } from "react";
import {
  memberTotals,
  planGoals,
  summarize,
} from "@/features/budget/domain/calc";
import { splitDebt, usTransactions } from "@/features/budget/domain/split";
import type { Transaction } from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";

// "Nós" shows the couple's shared view (repayments between the two
// net out); a person filter shows that person's own transactions.
function viewFor(transactions: Transaction[], memberFilter: string) {
  if (memberFilter === "all") return usTransactions(transactions);

  return transactions.filter((t) => t.memberId === memberFilter);
}

export function useWorkspaceData(
  budget: BudgetController,
  month: string,
  memberFilter: string,
) {
  const { transactions } = budget.state;
  const members = budget.household.members;

  const monthly = useMemo(
    () =>
      viewFor(transactions, memberFilter).filter((t) =>
        t.date.startsWith(month),
      ),
    [transactions, memberFilter, month],
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

  // Under "Nós" in a two-person space, each partner's part of the month.
  const partners = useMemo(
    () =>
      memberFilter === "all" && members.length === 2
        ? memberTotals(
            monthly,
            members.map((member) => member.id),
          ).map((totals, position) => ({
            ...totals,
            name: members[position].name,
            position,
          }))
        : undefined,
    [monthly, members, memberFilter],
  );

  const allTags = useMemo(
    () =>
      [...new Set(transactions.flatMap((t) => t.tags))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [transactions],
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
    summary,
    plans,
    partners,
    allTags,
    debt,
    partner,
    // Each person edits only their own percentages.
    canEditPercentages:
      memberFilter === "all" || memberFilter === budget.user.id,
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;

import { useMemo } from "react";
import { useHydrated } from "@tanstack/react-router";
import {
  memberTotals,
  planGoals,
  summarize,
} from "@/features/budget/domain/calc";
import { localDate } from "@/features/budget/domain/format";
import { splitDebt } from "@/features/budget/domain/split";
import { transactionsFor } from "@/features/budget/domain/view";
import type { BudgetController } from "@/features/budget/hooks/use-budget";

export function useWorkspaceData(
  budget: BudgetController,
  month: string,
  memberFilter: string,
) {
  const { transactions } = budget.state;
  const members = budget.household.members;

  const monthly = useMemo(
    () =>
      transactionsFor(
        transactions,
        memberFilter === "all" ? undefined : memberFilter,
      ).filter((t) => t.date.startsWith(month)),
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

  // Future splits are not owed yet. "Today" is the reader's date, which the
  // server cannot know, so the debt waits for hydration (null until then).
  const today = useHydrated() ? localDate() : null;

  const debt = useMemo(
    () => (today ? splitDebt(transactions, budget.user.id, today) : null),
    [transactions, budget.user.id, today],
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
    debt,
    partner,
    // Each person edits only their own percentages.
    canEditPercentages:
      memberFilter === "all" || memberFilter === budget.user.id,
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;

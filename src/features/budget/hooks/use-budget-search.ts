import { getRouteApi } from "@tanstack/react-router";
import {
  openGoalTransactions,
  openView,
  type BudgetSearch,
} from "@/features/budget/search";
import type { GoalId, TransactionKind, View } from "@/features/budget/domain/types";

const workspaceRoute = getRouteApi("/");

export function useBudgetSearch() {
  const search = workspaceRoute.useSearch();
  const navigate = workspaceRoute.useNavigate();

  function updateSearch(
    next: (prev: BudgetSearch) => BudgetSearch,
    replace = false,
  ) {
    void navigate({ to: "/", search: next, replace });
  }

  const view: View = search.view ?? "overview";
  const memberFilter = search.member ?? "all";
  const query = search.query ?? "";
  const goalFilter: GoalId | "all" = search.goal ?? "all";
  const tagFilter = search.tag ?? "";
  const kindFilter: TransactionKind | "all" = search.kind ?? "all";

  return {
    search,
    view,
    month: search.month,
    memberFilter,
    query,
    goalFilter,
    tagFilter,
    kindFilter,
    updateSearch,
    setMonth: (value: string) => {
      updateSearch((prev) => ({ ...prev, month: value }));
    },
    setMemberFilter: (member: string) => {
      updateSearch((prev) => ({
        ...prev,
        member: member === "all" ? undefined : member,
      }));
    },
    setQuery: (value: string) => {
      updateSearch((prev) => ({ ...prev, query: value || undefined }), true);
    },
    setGoalFilter: (goal: GoalId | "all") => {
      updateSearch((prev) => ({
        ...prev,
        goal: goal === "all" ? undefined : goal,
      }));
    },
    setKindFilter: (kind: TransactionKind | "all") => {
      updateSearch((prev) => ({
        ...prev,
        kind: kind === "all" ? undefined : kind,
      }));
    },
    setTag: (tag: string) => {
      updateSearch((prev) => ({
        ...prev,
        view: "transactions",
        tag: tag || undefined,
      }));
    },
    setView: (next: View) => {
      updateSearch((prev) => openView(prev, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    filterGoal: (id: GoalId) => {
      updateSearch((prev) => openGoalTransactions(prev, id));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };
}

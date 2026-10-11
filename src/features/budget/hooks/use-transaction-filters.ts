import { useQueryStates } from "nuqs";
import {
  pageParam,
  transactionFilterParams,
  type KindFilter,
} from "@/features/budget/search";
import type { GoalId } from "@/features/budget/domain/types";

// Filters narrow the list in place, keep the reader where they are, and
// send the list back to its first page.
export function useTransactionFilters() {
  const [search, setSearch] = useQueryStates(
    { ...transactionFilterParams, page: pageParam },
    { history: "push" },
  );

  const goalFilter: GoalId | "all" = search.goal ?? "all";
  const kindFilter: KindFilter | "all" = search.kind ?? "all";

  return {
    query: search.query ?? "",
    goalFilter,
    kindFilter,
    // Typing replaces the entry so each keystroke does not fill history.
    setQuery: (query: string) =>
      void setSearch(
        { query: query || null, page: null },
        { history: "replace" },
      ),
    setGoalFilter: (goal: GoalId | "all") =>
      void setSearch({ goal: goal === "all" ? null : goal, page: null }),
    setKindFilter: (kind: KindFilter | "all") =>
      void setSearch({ kind: kind === "all" ? null : kind, page: null }),
  };
}

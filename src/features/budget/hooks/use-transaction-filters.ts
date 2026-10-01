import { getRouteApi } from "@tanstack/react-router";
import type {
  KindFilter,
  TransactionFilterSearch,
} from "@/features/budget/search";
import type { GoalId } from "@/features/budget/domain/types";

const transactionsRoute = getRouteApi("/_authenticated/_workspace/transacoes");

export function useTransactionFilters() {
  const search = transactionsRoute.useSearch();
  const navigate = transactionsRoute.useNavigate();

  function update(next: TransactionFilterSearch, replace = false) {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, ...next }),
      replace,
    });
  }

  const goalFilter: GoalId | "all" = search.goal ?? "all";
  const kindFilter: KindFilter | "all" = search.kind ?? "all";

  return {
    query: search.query ?? "",
    goalFilter,
    tagFilter: search.tag ?? "",
    kindFilter,
    // Typing replaces the entry so each keystroke does not fill history.
    setQuery: (query: string) => update({ query: query || undefined }, true),
    setGoalFilter: (goal: GoalId | "all") =>
      update({ goal: goal === "all" ? undefined : goal }),
    setTag: (tag: string) => update({ tag: tag || undefined }),
    setKindFilter: (kind: KindFilter | "all") =>
      update({ kind: kind === "all" ? undefined : kind }),
  };
}

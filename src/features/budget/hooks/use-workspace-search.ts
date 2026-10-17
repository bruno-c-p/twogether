import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { failureMessage } from "@/lib/errors";
import { pageParam, workspaceParams } from "@/features/budget/search";
import { workspaceQueryOptions } from "@/features/budget/workspace";
import { useBrowserSync } from "@/lib/use-browser-sync";

// Month and person are shared by every workspace page, so updates stay on
// the current page (and at the current scroll position) instead of jumping
// back to the overview. Each choice is a history entry.
export function useWorkspaceSearch() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useQueryStates(
    { ...workspaceParams, page: pageParam },
    { history: "push" },
  );

  // A month not in memory loads before the URL changes, so the current
  // screen stays up instead of the loading skeleton. query() rejects when the
  // load fails (prefetchQuery does not), so a failure keeps the URL.
  const monthLoad = useMutation({
    mutationFn: (month: string) =>
      queryClient.query(workspaceQueryOptions(month)),
  });

  // A failure is about the month it was picked from. Once the URL is on
  // another month (back/forward, a page link) the message is stale, and a
  // pick still loading must not land there either.
  useBrowserSync(["month-load", search.month], monthLoad.reset);

  function setMonth(month: string) {
    const show = () => void setSearch({ month, page: null });

    if (queryClient.getQueryData(workspaceQueryOptions(month).queryKey)) {
      // An earlier pick still loading must not land after this one, and an
      // earlier failure is over.
      monthLoad.reset();
      show();

      return;
    }

    // Per-call callbacks run for the latest call only: the last pick wins.
    monthLoad.mutate(month, { onSuccess: show });
  }

  return {
    memberFilter: search.member ?? "all",
    monthPending: monthLoad.isPending,
    monthError: monthLoad.error ? failureMessage(monthLoad.error) : "",
    setMonth,
    setMemberFilter: (member: string) =>
      void setSearch({ member: member === "all" ? null : member, page: null }),
  };
}

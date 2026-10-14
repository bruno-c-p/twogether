import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { pageParam, workspaceParams } from "@/features/budget/search";
import { workspaceQueryOptions } from "@/features/budget/workspace";

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
  // screen stays up instead of the loading skeleton.
  const monthLoad = useMutation({
    mutationFn: (month: string) =>
      queryClient.prefetchQuery(workspaceQueryOptions(month)),
  });

  function setMonth(month: string) {
    const show = () => void setSearch({ month, page: null });

    if (queryClient.getQueryData(workspaceQueryOptions(month).queryKey)) {
      // An earlier pick still loading must not land after this one.
      if (monthLoad.isPending) monthLoad.reset();
      show();

      return;
    }

    // Per-call callbacks run for the latest call only: the last pick wins.
    monthLoad.mutate(month, { onSuccess: show });
  }

  return {
    memberFilter: search.member ?? "all",
    monthPending: monthLoad.isPending,
    setMonth,
    setMemberFilter: (member: string) =>
      void setSearch({ member: member === "all" ? null : member, page: null }),
  };
}

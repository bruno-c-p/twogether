import { useQueryStates } from "nuqs";
import { pageParam, workspaceParams } from "@/features/budget/search";

// Month and person are shared by every workspace page, so updates stay on
// the current page (and at the current scroll position) instead of jumping
// back to the overview. Each choice is a history entry.
export function useWorkspaceSearch() {
  const [search, setSearch] = useQueryStates(
    { ...workspaceParams, page: pageParam },
    { history: "push" },
  );

  return {
    memberFilter: search.member ?? "all",
    setMonth: (month: string) => void setSearch({ month, page: null }),
    setMemberFilter: (member: string) =>
      void setSearch({ member: member === "all" ? null : member, page: null }),
  };
}

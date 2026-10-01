import { getRouteApi, useNavigate } from "@tanstack/react-router";
import type { WorkspaceSearch } from "@/features/budget/search";

const workspaceRoute = getRouteApi("/_authenticated/_workspace");

// Month and person are shared by every workspace page, so updates stay on
// the current page instead of jumping back to the overview.
export function useWorkspaceSearch() {
  const search = workspaceRoute.useSearch();
  const navigate = useNavigate();

  function update(next: WorkspaceSearch) {
    void navigate({ to: ".", search: (prev) => ({ ...prev, ...next }) });
  }

  return {
    month: search.month,
    memberFilter: search.member ?? "all",
    setMonth: (month: string) => update({ month }),
    setMemberFilter: (member: string) =>
      update({ member: member === "all" ? undefined : member }),
  };
}

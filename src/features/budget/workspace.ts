import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { loadWorkspace } from "@/features/budget/actions";
import { shiftMonth } from "@/features/budget/domain/format";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";

export const workspaceQueryKey = ["workspace"] as const;

// One cache entry per month, so a page load carries one month of history
// instead of all of it.
export const workspaceQueryOptions = (month: string) =>
  queryOptions({
    queryKey: [...workspaceQueryKey, month],
    queryFn: () => loadWorkspace({ data: { month } }),
  });

export function hasCachedWorkspace(queryClient: QueryClient) {
  return queryClient
    .getQueriesData<WorkspaceSnapshot>({ queryKey: workspaceQueryKey })
    .some(([, snapshot]) => snapshot !== undefined);
}

// Page changes re-run the layout loader. Paint the snapshot already in
// memory and let a stale copy refresh behind the new screen.
export function loadCachedWorkspace(
  queryClient: QueryClient,
  month: string,
): WorkspaceSnapshot | Promise<WorkspaceSnapshot> {
  const options = workspaceQueryOptions(month);
  const cached = queryClient.getQueryData(options.queryKey);

  if (cached) {
    void queryClient.prefetchQuery(options).catch(() => undefined);

    return cached;
  }

  return queryClient.ensureQueryData(options);
}

export function prefetchMonth(queryClient: QueryClient, month: string) {
  void queryClient
    .prefetchQuery(workspaceQueryOptions(month))
    .catch(() => undefined);
}

// The months next to the one on screen, so stepping back or forward paints
// from memory.
export function prefetchNearbyMonths(queryClient: QueryClient, month: string) {
  prefetchMonth(queryClient, shiftMonth(month, -1));
  prefetchMonth(queryClient, shiftMonth(month, 1));
}

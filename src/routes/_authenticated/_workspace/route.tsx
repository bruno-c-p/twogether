import {
  createFileRoute,
  Navigate,
  redirect,
  retainSearchParams,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { BudgetApp } from "@/features/budget";
import {
  validateWorkspaceSearch,
  withDefaultMonthHref,
} from "@/features/budget/search";
import { loadCachedWorkspace } from "@/features/budget/workspace";
import { WorkspaceSkeleton } from "@/features/budget/components/workspace-skeleton";
import { toastManager } from "@/components/ui/toast-manager";
import {
  browserTimeZone,
  isValidTimeZone,
  monthIn,
  TIME_ZONE_COOKIE,
} from "@/lib/time-zone";

const requestTimeZone = createIsomorphicFn()
  .server(() => {
    const timeZone = getCookie(TIME_ZONE_COOKIE);

    return isValidTimeZone(timeZone) ? timeZone : undefined;
  })
  .client(() => browserTimeZone());

// Pathless layout for every workspace page: it owns the snapshot loader,
// the shell, and the month/person params that carry across pages.
export const Route = createFileRoute("/_authenticated/_workspace")({
  component: WorkspaceRoute,
  validateSearch: validateWorkspaceSearch,
  search: { middlewares: [retainSearchParams(["month", "member"])] },
  loaderDeps: ({ search }) => ({ month: search.month }),
  beforeLoad: ({ search, location }) => {
    if (search.month) return;
    const timeZone = requestTimeZone();

    if (!timeZone) return;
    throw redirect({ href: withDefaultMonthHref(location, monthIn(timeZone)) });
  },
  loader: ({ context, deps }) =>
    deps.month
      ? loadCachedWorkspace(context.queryClient, deps.month)
      : undefined,
  // Undo toasts act on this workspace; they go when the reader leaves it.
  onLeave: () => toastManager.close(),
  pendingComponent: WorkspaceSkeleton,
  pendingMs: 300,
  pendingMinMs: 0,
});

function WorkspaceRoute() {
  const search = Route.useSearch();

  // Without a time zone cookie the server could not pick the month; the
  // browser fills in its own current month.
  if (!search.month)
    return (
      <>
        <WorkspaceSkeleton />
        <Navigate
          to="."
          search={(prev) => ({ ...prev, month: monthIn(browserTimeZone()) })}
          replace
          resetScroll={false}
        />
      </>
    );

  return <BudgetApp month={search.month} />;
}

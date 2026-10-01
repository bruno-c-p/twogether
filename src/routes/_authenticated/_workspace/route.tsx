import { useEffect } from "react";
import {
  createFileRoute,
  redirect,
  retainSearchParams,
  useNavigate,
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
  beforeLoad: ({ search, location }) => {
    if (search.month) return;
    const timeZone = requestTimeZone();

    if (!timeZone) return;
    throw redirect({ href: withDefaultMonthHref(location, monthIn(timeZone)) });
  },
  loader: ({ context }) => loadCachedWorkspace(context.queryClient),
  pendingComponent: WorkspaceSkeleton,
  pendingMs: 300,
  pendingMinMs: 0,
});

function WorkspaceRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const missing = !search.month;

  // Without a time zone cookie the server could not pick the month; the
  // browser fills in its own current month.
  useEffect(() => {
    if (!missing) return;
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, month: monthIn(browserTimeZone()) }),
      replace: true,
      resetScroll: false,
    });
  }, [missing, navigate]);

  if (!search.month) return <WorkspaceSkeleton />;

  return <BudgetApp month={search.month} />;
}

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
  missingWorkspaceMonth,
  validateWorkspaceSearch,
  withDefaultMonth,
  withDefaultMonthHref,
} from "@/features/budget/search";
import { workspaceQueryOptions } from "@/features/budget/workspace";
import { LoadingState } from "@/features/budget/components/empty-state";
import {
  browserTimeZone,
  isValidTimeZone,
  monthIn,
  TIME_ZONE_COOKIE,
} from "@/lib/time-zone";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";

const requestTimeZone = createIsomorphicFn()
  .server(() => {
    const timeZone = getCookie(TIME_ZONE_COOKIE);

    return isValidTimeZone(timeZone) ? timeZone : undefined;
  })
  .client(() => browserTimeZone());

function BudgetPending() {
  return <LoadingState>Carregando orçamento…</LoadingState>;
}

// Pathless layout for every workspace page: it owns the snapshot loader,
// the shell, and the month/person params that carry across pages.
export const Route = createFileRoute("/_authenticated/_workspace")({
  component: WorkspaceRoute,
  validateSearch: validateWorkspaceSearch,
  search: { middlewares: [retainSearchParams(["month", "member"])] },
  beforeLoad: ({ search, location }) => {
    if (!missingWorkspaceMonth(search)) return;
    const timeZone = requestTimeZone();

    if (!timeZone) return;
    throw redirect({ href: withDefaultMonthHref(location, monthIn(timeZone)) });
  },
  loader: async ({ context }): Promise<WorkspaceSnapshot> =>
    context.queryClient.ensureQueryData(workspaceQueryOptions),
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function WorkspaceRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const missing = missingWorkspaceMonth(search);

  useEffect(() => {
    if (!missing) return;
    void navigate({
      to: ".",
      search: (prev) => withDefaultMonth(prev, monthIn(browserTimeZone())),
      replace: true,
      resetScroll: false,
    });
  }, [missing, navigate]);

  if (missing) return <BudgetPending />;

  return <BudgetApp />;
}

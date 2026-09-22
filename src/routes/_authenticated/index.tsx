import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { BudgetApp } from "@/features/budget";
import {
  missingWorkspaceMonth,
  validateBudgetFilters,
  withDefaultMonth,
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

export const Route = createFileRoute("/_authenticated/")({
  component: BudgetRoute,
  validateSearch: validateBudgetFilters,
  beforeLoad: ({ search }) => {
    if (!missingWorkspaceMonth(search)) return;
    const timeZone = requestTimeZone();
    if (!timeZone) return;
    throw redirect({
      to: "/",
      search: withDefaultMonth(search, monthIn(timeZone)),
    });
  },
  loader: async ({ context }): Promise<WorkspaceSnapshot> =>
    context.queryClient.ensureQueryData(workspaceQueryOptions),
  pendingComponent: BudgetPending,
  pendingMs: 300,
  pendingMinMs: 500,
});

function BudgetRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const missing = missingWorkspaceMonth(search);

  useEffect(() => {
    if (!missing) return;
    void navigate({
      to: "/",
      search: (prev) => withDefaultMonth(prev, monthIn(browserTimeZone())),
      replace: true,
    });
  }, [missing, navigate]);

  if (missing) return <BudgetPending />;
  return <BudgetApp />;
}

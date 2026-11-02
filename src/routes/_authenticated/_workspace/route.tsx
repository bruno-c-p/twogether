import { createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { AccountDrawer } from "@/features/auth/components/account-drawer";
import {
  loadCachedWorkspace,
  validateWorkspaceSearch,
} from "@/features/budget";
import { BudgetApp } from "@/features/budget/components/budget-app/budget-app";
import { WorkspaceSkeleton } from "@/features/budget/components/workspace-skeleton";
import { toast } from "@/components/glaze/ui/toast";
import { currentMonth } from "@/lib/clock";
import { useBrowserSync } from "@/lib/use-browser-sync";
import {
  browserTimeZone,
  isValidTimeZone,
  rememberedTimeZone,
  TIME_ZONE_COOKIE,
} from "@/lib/time-zone";

// Server and client read the same cookie, so the month the server rendered
// is the month the client hydrates.
const rememberedMonth = createIsomorphicFn()
  .server(() => {
    const timeZone = getCookie(TIME_ZONE_COOKIE);

    return isValidTimeZone(timeZone) ? currentMonth(timeZone) : undefined;
  })
  .client(() => {
    const timeZone = rememberedTimeZone();

    return timeZone ? currentMonth(timeZone) : undefined;
  });

// Pathless layout for every workspace page: it owns the snapshot loader,
// the shell, and the month/person params that carry across pages.
export const Route = createFileRoute("/_authenticated/_workspace")({
  component: WorkspaceRoute,
  validateSearch: validateWorkspaceSearch,
  search: { middlewares: [retainSearchParams(["month", "member"])] },
  // A bare URL renders the current month at once instead of redirecting.
  loaderDeps: ({ search }) => ({ month: search.month ?? rememberedMonth() }),
  loader: ({ context, deps }) =>
    deps.month
      ? loadCachedWorkspace(context.queryClient, deps.month)
      : undefined,
  // Undo toasts act on this workspace; they go when the reader leaves it.
  onLeave: () => toast.dismiss(),
  pendingComponent: WorkspaceSkeleton,
  pendingMs: 300,
  pendingMinMs: 0,
});

function WorkspaceRoute() {
  const search = Route.useSearch();
  const { month } = Route.useLoaderDeps();
  const navigate = Route.useNavigate();

  // The URL always ends up with the month, written once: a <Navigate> would
  // fire again on every render and overwrite a month the reader just picked.
  // Without a time zone cookie the server could not pick it, so the browser
  // fills in its own current month.
  useBrowserSync(
    ["workspace-month", month ?? "", search.month ?? ""],
    () =>
      void navigate({
        // From this pathless layout "." means "/", which would send
        // /transacoes to the overview; stay on the page the reader opened.
        to: ".",
        unsafeRelative: "path",
        search: (prev) => ({
          ...prev,
          month: month ?? currentMonth(browserTimeZone()),
        }),
        replace: true,
        resetScroll: false,
      }),
    !search.month,
  );

  return month ? (
    <BudgetApp month={month} account={AccountDrawer} />
  ) : (
    <WorkspaceSkeleton />
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { onTestFinished } from "vitest";
// The app preloads its lazy parts once a page is idle; tests start from that
// state, so a trigger they grab is not swapped out under them and an opened
// sheet or dialog does not wait on a first import.
import "@/components/ui/sheet-drawer";
import "@/features/auth/components/account-settings";
import "@/features/budget/components/month-grid";
import "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import "@/features/budget/components/settle-dialog";
import "@/features/budget/components/transaction-dialog/transaction-dialog";
import { defaultRateLimit } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { BudgetScreen } from "@/features/budget/components/screens/budget-screen";
import { OverviewScreen } from "@/features/budget/components/screens/overview-screen";
import { TransactionsScreen } from "@/features/budget/components/screens/transactions-screen";
import {
  validateTransactionFilters,
  validateWorkspaceSearch,
} from "@/features/budget/search";

// Mirrors the app's route ids ("/_authenticated/_workspace", its pages and
// "/entrar") and search validation, so components using getRouteApi() work
// without loaders, Clerk or the server. `ui` stands in for the workspace
// layout; the pages render only when it renders an <Outlet />.
export async function renderWithProviders(ui: ReactNode, path = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const root = createRootRoute({
    component: () => (
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
    ),
  });

  const authenticated = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
    component: Outlet,
  });

  const workspace = createRoute({
    getParentRoute: () => authenticated,
    id: "_workspace",
    validateSearch: validateWorkspaceSearch,
    search: { middlewares: [retainSearchParams(["month", "member"])] },
    component: () => ui,
  });

  const page = (path: string, component: () => ReactNode) =>
    createRoute({ getParentRoute: () => workspace, path, component });

  const routeTree = root.addChildren([
    authenticated.addChildren([
      workspace.addChildren([
        page("/", OverviewScreen),
        createRoute({
          getParentRoute: () => workspace,
          path: "/transacoes",
          validateSearch: validateTransactionFilters,
          component: TransactionsScreen,
        }),
        page("/orcamento", BudgetScreen),
      ]),
    ]),
    createRoute({
      getParentRoute: () => root,
      path: "/entrar",
      component: () => ui,
    }),
  ]);

  // nuqs reads the search string from window.location, so the router drives
  // jsdom's real history instead of an in-memory one.
  window.history.replaceState(null, "", path);

  const router = createRouter({
    routeTree,
    history: createBrowserHistory(),
    scrollRestoration: true,
  });

  const user = userEvent.setup();

  // nuqs writes the URL on a throttle timer, at most one rate-limit window
  // after its last flush. Waiting that window out lets a write queued at the
  // end of a test land while jsdom's `location` still exists, instead of
  // firing after the environment is torn down.
  onTestFinished(
    () =>
      new Promise((resolve) =>
        setTimeout(resolve, defaultRateLimit.timeMs + 10),
      ),
  );

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await router.load();

  return { ...view, user, router, queryClient, screen };
}

// URL state lives in memory, starting from `search` (e.g. "?page=2").
export function renderPlain(ui: ReactNode, search = "") {
  const view = render(ui, {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={search} hasMemory>
        {children}
      </NuqsTestingAdapter>
    ),
  });

  return { ...view, user: userEvent.setup(), screen };
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
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
import { AccountsScreen } from "@/features/budget/components/screens/accounts-screen";
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

  const root = createRootRoute({ component: Outlet });

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
        page("/contas", AccountsScreen),
        page("/orcamento", BudgetScreen),
      ]),
    ]),
    createRoute({
      getParentRoute: () => root,
      path: "/entrar",
      component: () => ui,
    }),
  ]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    scrollRestoration: true,
  });

  const user = userEvent.setup();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await router.load();

  return { ...view, user, router, queryClient, screen };
}

export function renderPlain(ui: ReactNode) {
  return { ...render(ui), user: userEvent.setup(), screen };
}

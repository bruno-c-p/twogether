import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { validateBudgetFilters } from "@/features/budget/search";

// Mirrors the app's route ids ("/_authenticated/", "/entrar") and workspace
// search validation, so components using getRouteApi() work without loaders,
// Clerk or the server.
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

  const routeTree = root.addChildren([
    authenticated.addChildren([
      createRoute({
        getParentRoute: () => authenticated,
        path: "/",
        validateSearch: validateBudgetFilters,
        component: () => ui,
      }),
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

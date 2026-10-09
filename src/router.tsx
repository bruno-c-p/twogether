import { QueryClient } from "@tanstack/react-query";
import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import posthog from "posthog-js";
import { routeTree } from "@/routeTree.gen";
import { RouteError } from "@/components/route-error/route-error";
import { reportError } from "@/lib/errors";

function parseSearch(searchStr: string) {
  const query: Record<string, string> = {};

  for (const [key, value] of new URLSearchParams(searchStr)) query[key] = value;

  return query;
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    parseSearch,
    stringifySearch: stringifySearchWith(String),
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    // Every route error boundary reports here once, as it catches the error.
    defaultOnCatch: (error, errorInfo) => {
      reportError(error, {
        componentStack: errorInfo.componentStack ?? undefined,
      });

      // PostHogProvider initializes this instance only when it is configured.
      if (posthog.__loaded) posthog.captureException(error);
    },
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

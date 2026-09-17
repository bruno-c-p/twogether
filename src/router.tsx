import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { routeTree } from "@/routeTree.gen";
import { RouteError } from "@/route-error";

function parseSearch(searchStr: string): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(searchStr)) query[key] = value;
  return query;
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnMount: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      },
    },
  });
  return createRouter({
    routeTree,
    scrollRestoration: true,
    parseSearch,
    stringifySearch: stringifySearchWith(String),
    defaultPreload: "intent",
    defaultErrorComponent: RouteError,
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

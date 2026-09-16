import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import { routeTree } from "@/src/routeTree.gen";

function parseSearch(searchStr: string): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(searchStr))
    query[key] = value;
  return query;
}

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    parseSearch,
    stringifySearch: stringifySearchWith(String),
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/budget")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (
          await import("@/features/budget/actions/api.server")
        ).handleBudgetRequest(request),
      POST: async ({ request }) =>
        (
          await import("@/features/budget/actions/api.server")
        ).handleBudgetRequest(request),
    },
  },
});

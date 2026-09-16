import { createFileRoute } from "@tanstack/react-router";
import { handleBudgetRequest } from "@/features/budget/actions/api.server";

export const Route = createFileRoute("/api/budget")({
  server: {
    handlers: {
      GET: ({ request }) => handleBudgetRequest(request),
      POST: ({ request }) => handleBudgetRequest(request),
    },
  },
});

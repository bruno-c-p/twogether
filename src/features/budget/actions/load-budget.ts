import { createServerFn } from "@tanstack/react-start";
import { sessionToken } from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";

export const loadBudget = createServerFn({ method: "GET" }).handler(() => {
  return getBudgetStore().snapshot(sessionToken());
});

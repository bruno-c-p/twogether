import { createServerFn } from "@tanstack/react-start";
import { currentUser } from "@/features/auth/current-user.server";
import { getBudgetStore } from "@/features/budget/budget.server";

export const loadBudget = createServerFn({ method: "GET" }).handler(
  async () => {
    return getBudgetStore().snapshot(await currentUser());
  },
);

import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getBudgetStore } from "@/features/budget/budget.server";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";

export const loadWorkspace = createServerFn({ method: "GET" })
  .middleware([householdMiddleware])
  .handler(async ({ context }): Promise<WorkspaceSnapshot> => {
    const data = await getBudgetStore().snapshot(context.user);
    if (!data.user?.name || !data.household) throw redirect({ to: "/entrar" });
    return { user: data.user, household: data.household, budget: data.budget };
  });

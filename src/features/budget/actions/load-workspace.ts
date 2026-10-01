import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getBudgetStore } from "@/features/budget/budget.server";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";

export const loadWorkspace = createServerFn({ method: "GET" })
  .middleware([householdMiddleware])
  .handler(async ({ context }): Promise<WorkspaceSnapshot> => {
    if (!context.user.name) throw redirect({ to: "/entrar" });

    return getBudgetStore().snapshot(context.user, context.householdId);
  });

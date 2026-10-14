import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getBudgetStore } from "@/features/budget/budget.server";
import { monthSchema } from "@/features/budget/domain/schemas";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const parseLoadWorkspace = actionInput<{ month: string }>(
  inputSchema({ month: monthSchema }),
);

export const loadWorkspace = createServerFn({ method: "GET" })
  .middleware([householdMiddleware])
  .validator(parseLoadWorkspace)
  .handler(async ({ data, context }): Promise<WorkspaceSnapshot> => {
    if (!context.user.name) throw redirect({ to: "/entrar" });

    return getBudgetStore().snapshot(
      context.user,
      context.householdId,
      data.month,
    );
  });

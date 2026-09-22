import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import type { WorkspaceHousehold } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";

export const loadHousehold = createServerFn({ method: "GET" })
  .middleware([householdMiddleware])
  .handler(
    async ({
      context,
    }): Promise<{
      user: { id: string; name: string };
      household: WorkspaceHousehold;
    }> => ({
      user: { id: context.user.id, name: context.user.name },
      household: await getBudgetStore().householdSnapshot(context.user),
    }),
  );

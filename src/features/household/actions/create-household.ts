import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { authMiddleware } from "@/server/middleware";

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    getBudgetStore().createHousehold(context.user),
  );

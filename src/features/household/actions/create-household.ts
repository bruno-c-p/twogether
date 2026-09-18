import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    runMutation(() => getBudgetStore().createHousehold(context.user)),
  );

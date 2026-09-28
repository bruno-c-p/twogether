import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { nameSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const setNameSchema = inputSchema({ name: nameSchema });

export const parseSetName = actionInput<{ name: string }>(setNameSchema);

export const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseSetName)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().setName(context.user, data.name)),
  );

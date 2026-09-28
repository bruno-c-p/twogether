import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { inviteTokenSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const joinHouseholdSchema = inputSchema({ token: inviteTokenSchema });

export const parseJoinHousehold = actionInput<{ token: string }>(
  joinHouseholdSchema,
);

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseJoinHousehold)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().joinHousehold(context.user, data.token)),
  );

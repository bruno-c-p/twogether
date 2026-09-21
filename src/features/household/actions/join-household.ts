import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { inviteTokenSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const joinHouseholdSchema = inputSchema({ token: inviteTokenSchema });

export function parseJoinHousehold(input: unknown): { token: string } {
  return parseInput(joinHouseholdSchema, input);
}

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseJoinHousehold)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().joinHousehold(context.user, data.token)),
  );

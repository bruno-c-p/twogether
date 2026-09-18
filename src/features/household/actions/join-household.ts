import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";
import { invalid, text } from "@/features/household/actions/parse";

export function parseJoinHousehold(input: unknown): { token: string } {
  if (!input || typeof input !== "object") invalid();
  return { token: text((input as Record<string, unknown>).token) };
}

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseJoinHousehold)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().joinHousehold(context.user, data.token)),
  );

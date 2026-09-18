import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { authMiddleware } from "@/server/middleware";
import { invalid, text } from "@/features/auth/actions/parse";

export function parseSetName(input: unknown): { name: string } {
  if (!input || typeof input !== "object") invalid();
  return { name: text((input as Record<string, unknown>).name) };
}

export const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseSetName)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().setName(context.user, data.name)),
  );

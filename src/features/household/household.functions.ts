import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { authMiddleware, householdMiddleware } from "@/server/middleware";

function invalid(): never {
  throw new Error("Requisição inválida.");
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}

export function parseJoinHousehold(input: unknown): { token: string } {
  if (!input || typeof input !== "object") invalid();
  return { token: text((input as Record<string, unknown>).token) };
}

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    runMutation(() => getBudgetStore().createHousehold(context.user)),
  );

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseJoinHousehold)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().joinHousehold(context.user, data.token)),
  );

export const createInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) =>
    runMutation(() =>
      getBudgetStore().createInvite(context.user, context.household),
    ),
  );

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(async ({ context }) =>
    runMutation(() =>
      getBudgetStore().revokeInvite(context.user, context.household),
    ),
  );

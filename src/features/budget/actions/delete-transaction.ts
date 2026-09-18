import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import {
  invalid,
  revision,
  text,
} from "@/features/budget/actions/parse";

function parseFollowing(
  value: unknown,
): { id: string; revision: number }[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof (item as { id?: unknown }).id !== "string" ||
        !Number.isSafeInteger((item as { revision?: unknown }).revision),
    )
  )
    invalid();
  return value as { id: string; revision: number }[];
}

export function parseDeleteTransaction(input: unknown): {
  id: string;
  revision: number;
  following?: { id: string; revision: number }[];
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  const following = parseFollowing(data.following);
  return following
    ? { id: text(data.id), revision: revision(data.revision), following }
    : { id: text(data.id), revision: revision(data.revision) };
}

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseDeleteTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().deleteTransaction(context.user, context.household, data),
    ),
  );

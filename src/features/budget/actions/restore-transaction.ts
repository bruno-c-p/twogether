import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { invalid, revision, text } from "@/features/budget/actions/parse";

export function parseRestoreTransaction(input: unknown): {
  id: string;
  revision: number;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  return { id: text(data.id), revision: revision(data.revision) };
}

export const restoreTransaction = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseRestoreTransaction)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().restoreTransaction(
        context.user,
        context.household,
        data,
      ),
    ),
  );

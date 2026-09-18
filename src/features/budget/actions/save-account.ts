import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { isBankAccount } from "@/features/budget/domain/validate";
import { runMutation } from "@/server/request-error";
import type { BankAccount } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { invalid } from "@/features/budget/actions/parse";

export function parseSaveAccount(input: unknown): { account: BankAccount } {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isBankAccount(data.account)) invalid();
  return { account: data.account };
}

export const saveAccount = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSaveAccount)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().saveAccount(
        context.user,
        context.household,
        data.account,
      ),
    ),
  );

import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { bankAccountSchema } from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import type { BankAccount } from "@/features/budget/domain/types";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const saveAccountSchema = inputSchema({ account: bankAccountSchema });

export function parseSaveAccount(input: unknown): { account: BankAccount } {
  return parseInput(saveAccountSchema, input);
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

import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  dateSchema,
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { runMutation } from "@/server/request-error";
import { householdMiddleware } from "@/server/middleware";
import { inputSchema, parseInput } from "@/server/action-input";

const settleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  date: dateSchema,
  payerAccountId: idSchema,
  partnerAccountId: idSchema,
});

export function parseSettleSplit(input: unknown): {
  id: string;
  revision: number;
  date: string;
  payerAccountId: string;
  partnerAccountId: string;
} {
  return parseInput(settleSplitSchema, input);
}

export const settleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSettleSplit)
  .handler(async ({ data, context }) =>
    runMutation(() =>
      getBudgetStore().settleSplit(context.user, context.household, data),
    ),
  );

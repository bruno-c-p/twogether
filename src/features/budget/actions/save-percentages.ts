import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { getStore } from "@/server/store.server";
import {
  goalPercentagesSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const savePercentagesSchema = inputSchema({
  percentages: goalPercentagesSchema,
  revision: revisionSchema,
});

export type SavePercentagesInput = z.infer<typeof savePercentagesSchema>;

export const parseSavePercentages = actionInput(savePercentagesSchema);

export const savePercentages = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSavePercentages)
  .handler(async ({ data, context }) =>
    getStore().savePercentages(context.user, data),
  );

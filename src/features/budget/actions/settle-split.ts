import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { getStore } from "@/server/store.server";
import {
  dateSchema,
  idSchema,
  revisionSchema,
} from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const settleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
  date: dateSchema,
});

export type SettleSplitInput = z.infer<typeof settleSplitSchema>;

export const parseSettleSplit = actionInput(settleSplitSchema);

export const settleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseSettleSplit)
  .handler(async ({ data, context }) =>
    getStore().settleSplit(context.user, context.householdId, data),
  );

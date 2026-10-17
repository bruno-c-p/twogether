import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { getStore } from "@/server/store.server";
import { idSchema, revisionSchema } from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const unsettleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export type UnsettleSplitInput = z.infer<typeof unsettleSplitSchema>;

export const parseUnsettleSplit = actionInput(unsettleSplitSchema);

export const unsettleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseUnsettleSplit)
  .handler(async ({ data, context }) =>
    getStore().unsettleSplit(context.user, context.householdId, data),
  );

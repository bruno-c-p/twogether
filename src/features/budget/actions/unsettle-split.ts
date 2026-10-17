import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { idSchema, revisionSchema } from "@/features/budget/domain/schemas";
import { householdMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const unsettleSplitSchema = inputSchema({
  id: idSchema,
  revision: revisionSchema,
});

export const parseUnsettleSplit = actionInput<{
  id: string;
  revision: number;
}>(unsettleSplitSchema);

export const unsettleSplit = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(parseUnsettleSplit)
  .handler(async ({ data, context }) =>
    getStore().unsettleSplit(context.user, context.householdId, data),
  );

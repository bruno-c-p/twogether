import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { inviteTokenSchema } from "@/lib/account-schemas";
import { authMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const joinHouseholdSchema = inputSchema({ token: inviteTokenSchema });

export const parseJoinHousehold = actionInput<{ token: string }>(
  joinHouseholdSchema,
);

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseJoinHousehold)
  .handler(async ({ data, context }) =>
    getStore().joinHousehold(context.user, data.token),
  );

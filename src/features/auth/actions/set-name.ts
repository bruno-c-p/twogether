import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { nameSchema } from "@/lib/account-schemas";
import { authMiddleware } from "@/server/middleware";
import { actionInput, inputSchema } from "@/server/action-input";

const setNameSchema = inputSchema({ name: nameSchema });

export const parseSetName = actionInput<{ name: string }>(setNameSchema);

export const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseSetName)
  .handler(async ({ data, context }) =>
    getStore().setName(context.user, data.name),
  );

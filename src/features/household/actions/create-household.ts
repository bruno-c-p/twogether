import { createServerFn } from "@tanstack/react-start";
import { getStore } from "@/server/store.server";
import { authMiddleware } from "@/server/middleware";

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => getStore().createHousehold(context.user));

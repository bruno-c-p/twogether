import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const privateNoStoreMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  result.response.headers.set("Cache-Control", "private, no-store");
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware(), csrfMiddleware, privateNoStoreMiddleware],
}));

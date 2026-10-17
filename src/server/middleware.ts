import { isRedirect, redirect } from "@tanstack/react-router";
import { auth } from "@clerk/tanstack-react-start/server";
import { createMiddleware } from "@tanstack/react-start";
import {
  getRequest,
  getRequestIP,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { reportError } from "@/lib/errors";
import { assertWritable, householdActor } from "@/server/actor.server";
import { rememberRetryAfter } from "@/server/rate-limit.server";
import { getStore } from "@/server/store.server";
import type { UserRow } from "@/server/db.server";
import {
  errorForLogs,
  RATE_LIMITED_MESSAGE,
  RequestError,
  UNEXPECTED_MESSAGE,
} from "@/server/request-error";

// Global and outermost: the one place a RequestError becomes an HTTP status
// and a client-safe message. Everything below it throws and lets it propagate.
export const errorMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (cause) {
      if (isRedirect(cause)) throw cause;

      if (cause instanceof RequestError) {
        setResponseStatus(cause.status);
        throw new Error(cause.message);
      }

      reportError(errorForLogs(cause), { context: "Budget mutation failed" });
      throw new Error(UNEXPECTED_MESSAGE);
    }
  },
);

export const rateLimitMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, method }) => {
  if (method === "GET") return next();
  const { userId } = await auth();
  const key = userId ?? getRequestIP({ xForwardedFor: true }) ?? "anonymous";

  assertWritable(key, (retryAfterSeconds) => {
    rememberRetryAfter(getRequest(), retryAfterSeconds);
    throw new RequestError(RATE_LIMITED_MESSAGE, 429);
  });

  return next();
});

async function currentUser(): Promise<UserRow | null> {
  const { userId } = await auth();

  if (!userId) return null;

  return getStore().ensureUser(userId);
}

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await currentUser();

    if (!user) throw redirect({ to: "/entrar" });

    return next({ context: { user } });
  },
);

export const optionalAuthMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => next({ context: { user: await currentUser() } }));

export const householdMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const { householdId } = householdActor(context.user);

    return next({ context: { householdId } });
  });

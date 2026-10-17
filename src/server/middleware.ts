import { redirect } from "@tanstack/react-router";
import { auth } from "@clerk/tanstack-react-start/server";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import {
  consumeRateLimit,
  rememberRetryAfter,
} from "@/server/rate-limit.server";
import { getStore } from "@/server/store.server";
import type { UserRow } from "@/server/db.server";
import {
  RATE_LIMITED_MESSAGE,
  RequestError,
  throwHttpError,
} from "@/server/request-error";

// Global and outermost: store errors reach the client as HTTP errors with a
// safe message, whatever middleware or handler threw them.
export const errorMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (cause) {
      throwHttpError(cause);
    }
  },
);

export const rateLimitMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, method }) => {
  if (method === "GET") return next();
  const { userId } = await auth();
  const key = userId ?? getRequestIP({ xForwardedFor: true }) ?? "anonymous";
  const verdict = consumeRateLimit(key);

  if (!verdict.ok) {
    rememberRetryAfter(getRequest(), verdict.retryAfterSeconds);
    throwHttpError(new RequestError(RATE_LIMITED_MESSAGE, 429));
  }

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
    const householdId = context.user.household_id;

    if (!householdId)
      throwHttpError(
        new RequestError("Crie um orçamento ou aceite um convite."),
      );

    return next({ context: { householdId } });
  });

import { redirect } from "@tanstack/react-router";
import { auth } from "@clerk/tanstack-react-start/server";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import { currentUser } from "@/features/auth/current-user.server";
import {
  consumeRateLimit,
  rememberRetryAfter,
} from "@/server/rate-limit.server";
import { RequestError, throwHttpError } from "@/server/request-error";

export const rateLimitMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, method }) => {
  if (method === "GET") return next();
  const { userId } = await auth();
  const key = userId ?? getRequestIP({ xForwardedFor: true }) ?? "anonymous";
  const verdict = consumeRateLimit(key);

  if (!verdict.ok) {
    rememberRetryAfter(getRequest(), verdict.retryAfterSeconds);
    throwHttpError(
      new RequestError(
        "Muitas alterações em pouco tempo. Aguarde um instante e tente novamente.",
        429,
        "limited",
      ),
    );
  }

  return next();
});

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

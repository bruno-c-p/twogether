import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  sessionToken,
} from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import { RequestError } from "@/server/request-error";
import { accessRedirectSearch, isBudgetToken } from "@/features/budget/search";
import { invalid } from "@/features/auth/actions/parse";

export function parseAccessPayload(input: unknown): {
  token: string;
  convite?: string;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  if (!isBudgetToken(data.token)) invalid();
  if (data.convite !== undefined && !isBudgetToken(data.convite)) invalid();
  return data.convite
    ? { token: data.token, convite: data.convite }
    : { token: data.token };
}

export const consumeAccess = createServerFn({ method: "POST" })
  .validator(parseAccessPayload)
  .handler(async ({ data }) => {
    try {
      const result = await getBudgetStore().verifyLink(
        { token: data.token },
        sessionToken(),
      );
      applySessionCookie(result.session);
    } catch (error) {
      if (!(error instanceof RequestError))
        console.error("Magic link failed", error);
    }
    throw redirect({
      to: "/entrar",
      search: accessRedirectSearch(data.convite),
    });
  });

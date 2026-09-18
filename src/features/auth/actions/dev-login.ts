import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  sessionToken,
} from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import { throwHttpError } from "@/server/request-error";
import { invalid, text } from "@/features/auth/actions/parse";

export function parseDevLogin(input: unknown): { email: string } {
  if (!input || typeof input !== "object") invalid();
  return { email: text((input as Record<string, unknown>).email) };
}

export const devLogin = createServerFn({ method: "POST" })
  .validator(parseDevLogin)
  .handler(async ({ data }) => {
    try {
      const result = await getBudgetStore().devLogin(data, sessionToken());
      applySessionCookie(result.session);
    } catch (error) {
      throwHttpError(error);
    }
  });

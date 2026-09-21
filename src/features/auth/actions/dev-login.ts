import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  sessionToken,
} from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import { emailSchema } from "@/features/budget/domain/schemas";
import { throwHttpError } from "@/server/request-error";
import { inputSchema, parseInput } from "@/server/action-input";

const devLoginSchema = inputSchema({ email: emailSchema });

export function parseDevLogin(input: unknown): { email: string } {
  return parseInput(devLoginSchema, input);
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

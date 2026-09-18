import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import { throwHttpError } from "@/server/request-error";
import { isBudgetToken } from "@/features/budget/search";
import { invalid, text } from "@/features/auth/actions/parse";

export function parseRequestLink(input: unknown): {
  email: string;
  invite?: string;
} {
  if (!input || typeof input !== "object") invalid();
  const data = input as Record<string, unknown>;
  const email = text(data.email);
  if (data.invite === undefined) return { email };
  if (!isBudgetToken(data.invite)) invalid();
  return { email, invite: data.invite };
}

export const requestLink = createServerFn({ method: "POST" })
  .validator(parseRequestLink)
  .handler(async ({ data }) => {
    try {
      await getBudgetStore().requestLink(data);
    } catch (error) {
      throwHttpError(error);
    }
  });

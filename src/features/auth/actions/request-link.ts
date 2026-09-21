import { createServerFn } from "@tanstack/react-start";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  emailSchema,
  inviteTokenSchema,
} from "@/features/budget/domain/schemas";
import { throwHttpError } from "@/server/request-error";
import { inputSchema, parseInput } from "@/server/action-input";

const requestLinkSchema = inputSchema({
  email: emailSchema,
  invite: inviteTokenSchema.optional(),
});

export function parseRequestLink(input: unknown): {
  email: string;
  invite?: string;
} {
  return parseInput(requestLinkSchema, input);
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

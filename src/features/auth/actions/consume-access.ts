import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  sessionToken,
} from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import {
  accessTokenSchema,
  inviteTokenSchema,
} from "@/features/budget/domain/schemas";
import { RequestError } from "@/server/request-error";
import { accessRedirectSearch } from "@/features/budget/search";
import { inputSchema, parseInput } from "@/server/action-input";

const accessPayloadSchema = inputSchema({
  token: accessTokenSchema,
  convite: inviteTokenSchema.optional(),
});

export function parseAccessPayload(input: unknown): {
  token: string;
  convite?: string;
} {
  return parseInput(accessPayloadSchema, input);
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

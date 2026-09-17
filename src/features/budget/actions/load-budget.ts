import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseStatus } from "@tanstack/react-start/server";
import {
  applySessionCookie,
  getBudgetStore,
  sessionCookie,
} from "@/features/budget/actions/budget-store.server";
import { parseAccessPayload, parseBudgetCommand } from "@/features/budget/command";
import { accessRedirectSearch } from "@/features/budget/search";
import { RequestError } from "@/features/budget/services/shared.server";

function sessionToken() {
  return getCookie(sessionCookie) ?? "";
}

export const loadBudget = createServerFn({ method: "GET" }).handler(() => {
  return getBudgetStore().snapshot(sessionToken());
});

export const mutateBudget = createServerFn({ method: "POST" })
  .validator(parseBudgetCommand)
  .handler(async ({ data }) => {
    const previous = sessionToken();
    try {
      const result = await getBudgetStore().command(data, previous);
      if (result.session !== previous) applySessionCookie(result.session);
      return { inviteToken: result.inviteToken };
    } catch (error) {
      if (error instanceof RequestError) {
        setResponseStatus(error.status);
        throw new Error(error.message);
      }
      console.error("Budget mutation failed", error);
      throw new Error("Não foi possível concluir. Tente novamente.");
    }
  });

export const consumeAccess = createServerFn({ method: "POST" })
  .validator(parseAccessPayload)
  .handler(async ({ data }) => {
    try {
      const result = await getBudgetStore().command(
        { action: "verify-link", token: data.token },
        sessionToken(),
      );
      applySessionCookie(result.session);
    } catch (error) {
      if (!(error instanceof RequestError))
        console.error("Magic link failed", error);
    }
    throw redirect({
      to: "/",
      search: accessRedirectSearch(data.convite),
    });
  });

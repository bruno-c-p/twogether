import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  getBudgetStore,
  sessionToken,
  throwHttpError,
} from "@/features/budget/actions/budget-store.server";
import {
  parseAccessPayload,
  parseDevLogin,
  parseRequestLink,
} from "@/features/budget/command";
import { RequestError } from "@/features/budget/services/shared.server";
import { accessRedirectSearch } from "@/features/budget/search";

export const requestLink = createServerFn({ method: "POST" })
  .validator(parseRequestLink)
  .handler(async ({ data }) => {
    try {
      await getBudgetStore().requestLink(data);
    } catch (error) {
      throwHttpError(error);
    }
  });

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

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await getBudgetStore().logout(sessionToken());
  } catch (error) {
    throwHttpError(error);
  }
  applySessionCookie(undefined);
  throw redirect({ to: "/entrar" });
});

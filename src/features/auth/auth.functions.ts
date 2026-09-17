import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  getBudgetStore,
  runMutation,
  sessionToken,
  throwHttpError,
} from "@/features/budget/actions/budget-store.server";
import { RequestError } from "@/features/budget/services/shared.server";
import { accessRedirectSearch, isBudgetToken } from "@/features/budget/search";
import { authMiddleware } from "@/server/middleware";

function invalid(): never {
  throw new Error("Requisição inválida.");
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}

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

export function parseDevLogin(input: unknown): { email: string } {
  if (!input || typeof input !== "object") invalid();
  return { email: text((input as Record<string, unknown>).email) };
}

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

export function parseSetName(input: unknown): { name: string } {
  if (!input || typeof input !== "object") invalid();
  return { name: text((input as Record<string, unknown>).name) };
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

export const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseSetName)
  .handler(async ({ data, context }) =>
    runMutation(() => getBudgetStore().setName(context.user, data.name)),
  );

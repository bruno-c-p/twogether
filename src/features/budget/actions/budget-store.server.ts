import { resolve } from "node:path";
import { isRedirect } from "@tanstack/react-router";
import {
  getCookie,
  getRequestProtocol,
  setCookie,
  setResponseStatus,
} from "@tanstack/react-start/server";
import {
  createBudgetStore,
  RequestError,
  type BudgetStore,
} from "@/features/budget/services/shared.server";
import {
  sessionCookie,
  sessionCookieOptions,
} from "@/features/budget/session-cookie";
import type { MutationResult } from "@/server/mutation-result";

export { sessionCookie, sessionCookieOptions };

let store: BudgetStore | undefined;

export function getBudgetStore(): BudgetStore {
  return (store ??= createBudgetStore(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  ));
}

export function sessionToken() {
  return getCookie(sessionCookie) ?? "";
}

export function applySessionCookie(session: string | undefined) {
  setCookie(
    sessionCookie,
    session ?? "",
    sessionCookieOptions(getRequestProtocol() === "https", session),
  );
}

export function throwHttpError(error: unknown): never {
  if (isRedirect(error)) throw error;
  if (error instanceof RequestError) {
    setResponseStatus(error.status);
    throw new Error(error.message);
  }
  console.error("Budget mutation failed", error);
  throw new Error("Não foi possível concluir. Tente novamente.");
}

export async function runMutation<T extends object = Record<string, never>>(
  fn: () => Promise<T | void>,
): Promise<MutationResult<T>> {
  try {
    const value = await fn();
    return { ok: true, ...(value as T) };
  } catch (error) {
    if (
      error instanceof RequestError &&
      error.status !== 401 &&
      error.status < 500
    )
      return { ok: false, code: error.code, message: error.message };
    throwHttpError(error);
  }
}

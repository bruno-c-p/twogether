import { resolve } from "node:path";
import {
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import {
  createBudgetStore,
  type BudgetStore,
} from "@/features/budget/services/shared.server";
import {
  sessionCookie,
  sessionCookieOptions,
} from "@/features/budget/session-cookie";

export { sessionCookie, sessionCookieOptions };

let store: BudgetStore | undefined;

export function getBudgetStore(): BudgetStore {
  return (store ??= createBudgetStore(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  ));
}

export function applySessionCookie(session: string | undefined) {
  setCookie(
    sessionCookie,
    session ?? "",
    sessionCookieOptions(getRequestProtocol() === "https", session),
  );
}

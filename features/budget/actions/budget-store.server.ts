import { resolve } from "node:path";
import {
  createBudgetStore,
  type BudgetStore,
} from "../services/shared.server";

let store: BudgetStore | undefined;
export const sessionCookie = "twogether_session";

export function getBudgetStore(): BudgetStore {
  return (store ??= createBudgetStore(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  ));
}

export function readSessionToken(request: Request): string {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${sessionCookie}=`))
      ?.slice(sessionCookie.length + 1) ?? ""
  );
}

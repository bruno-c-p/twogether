import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getBudgetStore, sessionCookie } from "./budget-store.server";

export const loadBudget = createServerFn({ method: "GET" }).handler(() =>
  getBudgetStore().snapshot(getCookie(sessionCookie) ?? ""),
);

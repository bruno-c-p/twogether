import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  applySessionCookie,
  sessionToken,
} from "@/features/auth/session.server";
import { getBudgetStore } from "@/features/budget/budget.server";
import { throwHttpError } from "@/server/request-error";

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await getBudgetStore().logout(sessionToken());
  } catch (error) {
    throwHttpError(error);
  }
  applySessionCookie(undefined);
  throw redirect({ to: "/entrar" });
});

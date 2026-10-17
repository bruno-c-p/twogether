import { createAuthStore } from "@/features/auth/auth.server";
import {
  createBudgetStore,
  NEW_USER_PERCENTAGES,
} from "@/features/budget/budget.server";
import { createHouseholdStore } from "@/features/household/household.server";
import { createStoreContext } from "@/server/db.server";
import { databaseUrl } from "@/server/env.server";

// The composition root: the only module that knows every feature's store.
export function createStore(filename: string) {
  const ctx = createStoreContext(filename);

  return {
    ...createAuthStore(ctx, NEW_USER_PERCENTAGES),
    ...createHouseholdStore(ctx),
    ...createBudgetStore(ctx),
    close: () => ctx.close(),
  };
}

export type Store = ReturnType<typeof createStore>;

let store: Store | undefined;

export function getStore(): Store {
  return (store ??= createStore(databaseUrl()));
}

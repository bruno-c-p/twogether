import { createAuthStore } from "@/features/auth/auth.server";
import {
  createBudgetStore,
  NEW_USER_PERCENTAGES,
} from "@/features/budget/budget.server";
import { createHouseholdStore } from "@/features/household/household.server";
import { createStoreContext } from "@/server/db.server";
import { databaseUrl } from "@/server/env.server";

// A plain spread would let a method name in two stores silently replace the
// other; here a shared name fails to compile.
function merge<A extends object, B extends object>(
  a: A,
  b: B & Partial<Record<keyof A, never>>,
): A & B {
  return { ...a, ...b };
}

export function createStore(filename: string) {
  const ctx = createStoreContext(filename);

  return merge(
    merge(
      merge(
        createAuthStore(ctx, NEW_USER_PERCENTAGES),
        createHouseholdStore(ctx),
      ),
      createBudgetStore(ctx),
    ),
    { close: () => ctx.close() },
  );
}

export type Store = ReturnType<typeof createStore>;

let store: Store | undefined;

export function getStore(): Store {
  return (store ??= createStore(databaseUrl()));
}

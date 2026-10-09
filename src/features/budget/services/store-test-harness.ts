import { afterEach, beforeEach } from "bun:test";
import {
  createBudgetStore,
  type BudgetStore,
} from "@/features/budget/budget.server";
import { RequestError } from "@/server/request-error";
import type { UserRow } from "@/server/db.server";
import type { Transaction } from "@/features/budget/domain/types";

export function transaction(memberId: string): Transaction {
  return {
    id: "transaction-1",
    description: "Mercado",
    amount: 10000,
    kind: "expense",
    date: "2026-09-14",
    goal: "fixed",
    memberId,
  };
}

function clerkId(name: string) {
  return `user_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function requireUser(store: BudgetStore, user: UserRow) {
  return store.ensureUser(user.id);
}

// Mirrors householdMiddleware: re-read the user, then require a household.
export async function withHousehold(store: BudgetStore, user: UserRow) {
  const fresh = await store.ensureUser(user.id);

  if (!fresh.household_id)
    throw new RequestError("Crie um orçamento ou aceite um convite.");

  return { user: fresh, householdId: fresh.household_id };
}

// The workspace as loadWorkspace would serve it to this user right now.
export async function view(store: BudgetStore, user: UserRow) {
  const actor = await withHousehold(store, user);

  return store.snapshot(actor.user, actor.householdId);
}

export async function signup(store: BudgetStore, name: string) {
  const user = await store.ensureUser(clerkId(name));
  await store.setName(user, name);

  return { user: await store.ensureUser(user.id) };
}

export async function couple(store: BudgetStore) {
  const a = await signup(store, "Ana");
  await store.createHousehold(a.user);
  const ana = await withHousehold(store, a.user);
  const invite = await store.createInvite(ana.householdId);
  const b = await signup(store, "Bia");
  await store.joinHousehold(b.user, invite.inviteToken);

  return {
    a: { user: ana.user },
    b: { user: await store.ensureUser(b.user.id) },
  };
}

export function setupMemoryStore() {
  let current: BudgetStore | undefined;

  beforeEach(() => {
    current = createBudgetStore(":memory:");
  });
  afterEach(() => {
    current?.close();
  });

  return {
    get store() {
      if (!current)
        throw new Error("The memory store only exists inside a test.");

      return current;
    },
  };
}

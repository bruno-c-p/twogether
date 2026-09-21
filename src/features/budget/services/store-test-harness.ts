import { afterEach, beforeEach } from "bun:test";
import {
  createBudgetStore,
  type BudgetStore,
} from "@/features/budget/budget.server";
import { RequestError } from "@/server/request-error";
import type { UserRow } from "@/server/db.server";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";

export function account(id = "account-1"): BankAccount {
  return { id, name: "Nubank", openingBalance: 0 };
}

export function transaction(
  memberId: string,
  accountId = "account-1",
): Transaction {
  return {
    id: "transaction-1",
    description: "Mercado",
    amount: 10000,
    kind: "expense",
    date: "2026-09-14",
    goal: "fixed",
    tags: ["casa"],
    memberId,
    accountId,
  };
}

export function clerkId(name: string) {
  return `user_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function requireUser(store: BudgetStore, user: UserRow) {
  return store.ensureUser(user.id);
}

export async function withHousehold(store: BudgetStore, user: UserRow) {
  const fresh = await store.ensureUser(user.id);
  const household = await store.householdFor(fresh);
  if (!household)
    throw new RequestError("Crie um orçamento ou aceite um convite.");
  return { user: fresh, household };
}

export async function signup(store: BudgetStore, name: string) {
  const user = await store.ensureUser(clerkId(name));
  await store.setName(user, name);
  const fresh = await store.ensureUser(user.id);
  return { user: fresh, snapshot: await store.snapshot(fresh) };
}

export async function couple(store: BudgetStore) {
  const a = await signup(store, "Ana");
  await store.createHousehold(a.user);
  const ana = await withHousehold(store, a.user);
  const invite = await store.createInvite(ana.user, ana.household);
  const b = await signup(store, "Bia");
  await store.joinHousehold(b.user, invite.inviteToken);
  const bia = await store.ensureUser(b.user.id);
  return {
    a: { ...a, snapshot: await store.snapshot(a.user) },
    b: { ...b, user: bia, snapshot: await store.snapshot(bia) },
  };
}

export async function householdReady(store: BudgetStore) {
  const pair = await couple(store);
  const actor = await withHousehold(store, pair.a.user);
  await store.saveAccount(actor.user, actor.household, account());
  return pair;
}

export function setupMemoryStore() {
  const state: { store: BudgetStore } = {
    store: undefined as unknown as BudgetStore,
  };
  beforeEach(() => {
    state.store = createBudgetStore(":memory:");
  });
  afterEach(() => {
    state.store.close();
  });
  return state;
}

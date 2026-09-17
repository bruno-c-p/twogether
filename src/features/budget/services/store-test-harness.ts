import { afterEach, beforeEach } from "bun:test";
import {
  createBudgetStore,
  RequestError,
  type BudgetStore,
} from "@/features/budget/services/shared.server";
import type { BankAccount, Transaction } from "@/features/budget/types";

export type Deliveries = { email: string; token: string; invite?: string }[];

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

export async function requireUser(
  store: BudgetStore,
  session: string | undefined,
) {
  const user = await store.sessionUser(session);
  if (!user)
    throw new RequestError("Sua sessão expirou. Entre novamente.", 401);
  return user;
}

export async function withHousehold(
  store: BudgetStore,
  session: string | undefined,
) {
  const user = await requireUser(store, session);
  const household = await store.householdFor(user);
  if (!household)
    throw new RequestError("Crie um orçamento ou aceite um convite.");
  return { user, household };
}

export async function signup(
  store: BudgetStore,
  deliveries: Deliveries,
  name: string,
) {
  await store.requestLink({
    email: `${name.toLowerCase()}@example.test`,
  });
  const result = await store.verifyLink(
    { token: deliveries.at(-1)!.token },
    undefined,
  );
  await store.setName(await requireUser(store, result.session), name);
  return {
    session: result.session,
    snapshot: await store.snapshot(result.session),
  };
}

export async function couple(store: BudgetStore, deliveries: Deliveries) {
  const a = await signup(store, deliveries, "Ana");
  await store.createHousehold(await requireUser(store, a.session));
  const ana = await withHousehold(store, a.session);
  const invite = await store.createInvite(ana.user, ana.household);
  const b = await signup(store, deliveries, "Bia");
  await store.joinHousehold(
    await requireUser(store, b.session),
    invite.inviteToken,
  );
  return {
    a: { ...a, snapshot: await store.snapshot(a.session) },
    b: { ...b, snapshot: await store.snapshot(b.session) },
  };
}

export async function householdReady(
  store: BudgetStore,
  deliveries: Deliveries,
) {
  const pair = await couple(store, deliveries);
  const actor = await withHousehold(store, pair.a.session);
  await store.saveAccount(actor.user, actor.household, account());
  return pair;
}

export function setupMemoryStore() {
  let previousOrigin: string | undefined;
  const state: { store: BudgetStore; deliveries: Deliveries } = {
    store: undefined as unknown as BudgetStore,
    deliveries: [],
  };
  beforeEach(() => {
    previousOrigin = process.env.APP_ORIGIN;
    process.env.APP_ORIGIN = "https://budget.test";
    state.deliveries = [];
    state.store = createBudgetStore(":memory:", {
      sendMagicLink: (message) => {
        state.deliveries.push(message);
        return Promise.resolve();
      },
    });
  });
  afterEach(() => {
    state.store.close();
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
  });
  return state;
}

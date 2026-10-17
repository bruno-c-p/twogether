import { afterEach, beforeEach } from "bun:test";
import { createStore, type Store } from "@/server/store.server";
import { householdActor } from "@/server/actor.server";
import type { UserRow } from "@/server/db.server";

function clerkId(name: string) {
  return `user_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function requireUser(store: Store, user: UserRow) {
  return store.ensureUser(user.id);
}

// Mirrors householdMiddleware: re-read the user, then require a household.
export async function withHousehold(store: Store, user: UserRow) {
  return householdActor(await store.ensureUser(user.id));
}

// The workspace as loadWorkspace would serve it to this user right now.
export async function view(store: Store, user: UserRow) {
  const actor = await withHousehold(store, user);

  return store.snapshot(actor.user, actor.householdId);
}

export async function signup(store: Store, name: string) {
  const user = await store.ensureUser(clerkId(name));
  await store.setName(user, name);

  return { user: await store.ensureUser(user.id) };
}

export async function couple(store: Store) {
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
  let current: Store | undefined;

  beforeEach(() => {
    current = createStore(":memory:");
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

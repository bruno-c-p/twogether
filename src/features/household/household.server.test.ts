import { describe, expect, setSystemTime, test } from "bun:test";
import {
  requireUser,
  signup,
  setupMemoryStore,
  view,
  withHousehold,
} from "@/features/budget/services/store-test-harness";
import { now } from "@/lib/clock";

const ctx = setupMemoryStore();

describe("household store", () => {
  test("invitation is single use and a household admits exactly two", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const ana = await withHousehold(store, a.user);
    const invite = await store.createInvite(ana.householdId);
    const b = await signup(store, "Bia");
    const c = await signup(store, "Cris");

    const results = await Promise.allSettled(
      [b, c].map(async (person) =>
        store.joinHousehold(
          await requireUser(store, person.user),
          invite.inviteToken,
        ),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await view(store, a.user)).household.members).toHaveLength(2);
    const full = await withHousehold(store, a.user);
    await expect(store.createInvite(full.householdId)).rejects.toThrow(
      "duas pessoas",
    );
    await expect(
      store.joinHousehold(await requireUser(store, a.user), invite.inviteToken),
    ).rejects.toThrow("já faz parte");
  });

  test("a stale user row cannot claim a second household", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(a.user);
    await expect(store.createHousehold(a.user)).rejects.toThrow("já faz parte");
    const b = await signup(store, "Bia");
    const ana = await withHousehold(store, a.user);
    const invite = await store.createInvite(ana.householdId);
    await store.createHousehold(b.user);
    await expect(
      store.joinHousehold(b.user, invite.inviteToken),
    ).rejects.toThrow("já faz parte");
    expect((await view(store, a.user)).household.members).toHaveLength(1);
  });

  test("replacing or revoking invitations invalidates old links", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const b = await signup(store, "Bia");
    const first = await withHousehold(store, a.user);
    const old = await store.createInvite(first.householdId);
    const next = await store.createInvite(first.householdId);
    await expect(
      store.joinHousehold(await requireUser(store, b.user), old.inviteToken),
    ).rejects.toThrow("expirado");
    await store.revokeInvite(first.householdId);
    await expect(
      store.joinHousehold(await requireUser(store, b.user), next.inviteToken),
    ).rejects.toThrow("expirado");
  });

  test("invites expire after 48 hours", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const b = await signup(store, "Bia");
    const ana = await withHousehold(store, a.user);
    const invite = await store.createInvite(ana.householdId);

    try {
      setSystemTime(now().getTime() + 49 * 3600_000);
      await expect(
        store.joinHousehold(
          await requireUser(store, b.user),
          invite.inviteToken,
        ),
      ).rejects.toThrow("expirado");
    } finally {
      setSystemTime();
    }
  });
});

import { describe, expect, test } from "bun:test";
import {
  requireUser,
  signup,
  setupMemoryStore,
  withHousehold,
} from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

describe("household store", () => {
  test("invitation is single use and a household admits exactly two", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const ana = await withHousehold(store, a.user);
    const invite = await store.createInvite(ana.user, ana.household);
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
    expect((await store.snapshot(a.user)).household?.members).toHaveLength(
      2,
    );
    const full = await withHousehold(store, a.user);
    await expect(store.createInvite(full.user, full.household)).rejects.toThrow(
      "duas pessoas",
    );
    await expect(
      store.joinHousehold(
        await requireUser(store, a.user),
        invite.inviteToken,
      ),
    ).rejects.toThrow("já faz parte");
  });

  test("replacing or revoking invitations invalidates old links", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const b = await signup(store, "Bia");
    const first = await withHousehold(store, a.user);
    const old = await store.createInvite(first.user, first.household);
    const next = await store.createInvite(first.user, first.household);
    await expect(
      store.joinHousehold(await requireUser(store, b.user), old.inviteToken),
    ).rejects.toThrow("expirado");
    await store.revokeInvite(first.user, first.household);
    await expect(
      store.joinHousehold(
        await requireUser(store, b.user),
        next.inviteToken,
      ),
    ).rejects.toThrow("expirado");
  });

  test("invites expire after 48 hours", async () => {
    const { store } = ctx;
    const a = await signup(store, "Ana");
    await store.createHousehold(await requireUser(store, a.user));
    const b = await signup(store, "Bia");
    const ana = await withHousehold(store, a.user);
    const invite = await store.createInvite(ana.user, ana.household);
    const now = Date.now;
    const time = now();
    try {
      Date.now = () => time + 49 * 3600_000;
      await expect(
        store.joinHousehold(
          await requireUser(store, b.user),
          invite.inviteToken,
        ),
      ).rejects.toThrow("expirado");
    } finally {
      Date.now = now;
    }
  });
});

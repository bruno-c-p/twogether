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
    const { store, deliveries } = ctx;
    const a = await signup(store, deliveries, "Ana");
    await store.createHousehold(await requireUser(store, a.session));
    const ana = await withHousehold(store, a.session);
    const invite = await store.createInvite(ana.user, ana.household);
    const b = await signup(store, deliveries, "Bia");
    const c = await signup(store, deliveries, "Cris");
    const results = await Promise.allSettled(
      [b, c].map(async (person) =>
        store.joinHousehold(
          await requireUser(store, person.session),
          invite.inviteToken,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await store.snapshot(a.session)).household?.members).toHaveLength(
      2,
    );
    const full = await withHousehold(store, a.session);
    await expect(store.createInvite(full.user, full.household)).rejects.toThrow(
      "duas pessoas",
    );
    await expect(
      store.joinHousehold(
        await requireUser(store, a.session),
        invite.inviteToken,
      ),
    ).rejects.toThrow("já faz parte");
  });

  test("replacing or revoking invitations invalidates old links", async () => {
    const { store, deliveries } = ctx;
    const a = await signup(store, deliveries, "Ana");
    await store.createHousehold(await requireUser(store, a.session));
    const b = await signup(store, deliveries, "Bia");
    const first = await withHousehold(store, a.session);
    const old = await store.createInvite(first.user, first.household);
    const next = await store.createInvite(first.user, first.household);
    await expect(
      store.joinHousehold(await requireUser(store, b.session), old.inviteToken),
    ).rejects.toThrow("expirado");
    await store.revokeInvite(first.user, first.household);
    await expect(
      store.joinHousehold(
        await requireUser(store, b.session),
        next.inviteToken,
      ),
    ).rejects.toThrow("expirado");
  });

  test("invites expire after 48 hours", async () => {
    const { store, deliveries } = ctx;
    const a = await signup(store, deliveries, "Ana");
    await store.createHousehold(await requireUser(store, a.session));
    const b = await signup(store, deliveries, "Bia");
    const ana = await withHousehold(store, a.session);
    const invite = await store.createInvite(ana.user, ana.household);
    const now = Date.now;
    const time = now();
    try {
      Date.now = () => time + 49 * 3600_000;
      await expect(
        store.joinHousehold(
          await requireUser(store, b.session),
          invite.inviteToken,
        ),
      ).rejects.toThrow("expirado");
    } finally {
      Date.now = now;
    }
  });
});

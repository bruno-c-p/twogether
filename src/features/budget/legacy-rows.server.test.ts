import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStoreContext, type StoreContext } from "@/server/db.server";
import { createStore, type Store } from "@/server/store.server";
import { couple, view, withHousehold } from "@/server/store-test-harness";
import { transaction } from "@/test/store-transaction";

// D1 (AGENTS.md): settling a legacy split is answered from transactionStatus,
// which lets either partner settle and carries the missing memberId over to
// the repayment income. Pinned so a change here is deliberate.
describe("settling a split saved before memberId existed", () => {
  let dir = "";
  let store: Store | undefined;
  let raw: StoreContext | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "twogether-legacy-"));
    store = createStore(join(dir, "db.sqlite"));
    raw = createStoreContext(join(dir, "db.sqlite"));
  });

  afterEach(() => {
    store?.close();
    raw?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // Seeds a split as Ana, strips its memberId, lets `settler` settle it and
  // returns the repayment income it wrote.
  async function settledBy(settler: "a" | "b") {
    if (!store || !raw) throw new Error("stores exist inside a test");

    const people = await couple(store);
    const ana = await withHousehold(store, people.a.user);
    const actor = await withHousehold(store, people[settler].user);

    await store.saveTransaction(ana.user, ana.householdId, {
      transaction: { ...transaction("ana"), id: "legacy", split: {} },
    });
    await raw.db.execute({
      sql: "UPDATE transactions SET payload = json_remove(payload, '$.memberId') WHERE id = ?",
      args: ["legacy"],
    });

    const legacy = (await view(store, ana.user)).budget.transactions.find(
      (t) => t.id === "legacy",
    );

    if (!legacy) throw new Error("legacy row missing");

    await store.settleSplit(actor.user, actor.householdId, {
      id: legacy.id,
      revision: legacy.revision ?? 0,
      date: "2026-09-20",
    });

    return (await view(store, ana.user)).budget.transactions.find(
      (t) => t.settlementOf === "legacy" && t.kind === "income",
    );
  }

  test("its creator may settle it and the repayment income has no memberId", async () => {
    const income = await settledBy("a");

    expect(income).toBeDefined();
    expect(income?.memberId).toBeUndefined();
  });

  test("the other partner may settle it and the repayment income has no memberId", async () => {
    const income = await settledBy("b");

    expect(income).toBeDefined();
    expect(income?.memberId).toBeUndefined();
  });
});

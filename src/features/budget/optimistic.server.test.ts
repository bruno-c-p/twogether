import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  budgetMutations,
  type BudgetExtra,
  type BudgetInput,
  type BudgetMutationName,
} from "@/features/budget/actions/mutations";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import type { ActorFor } from "@/server/mutation";
import { createStoreContext, type StoreContext } from "@/server/db.server";
import { createStore, type Store } from "@/server/store.server";
import {
  couple,
  setupMemoryStore,
  view,
  withHousehold,
} from "@/server/store-test-harness";
import { transaction } from "@/test/store-transaction";
import { cents } from "@/test/cents";

type Actor = ActorFor<"household">;

type Registry = typeof budgetMutations;

type OptimisticName = {
  [K in BudgetMutationName]: undefined extends Registry[K]["optimistic"]
    ? never
    : K;
}[BudgetMutationName];

type Args<K extends BudgetMutationName> =
  BudgetExtra<K> extends undefined
    ? [input: BudgetInput<K>]
    : [input: BudgetInput<K>, extra: BudgetExtra<K>];

type Updater<K extends OptimisticName> = (
  snapshot: WorkspaceSnapshot,
  ...args: Args<K>
) => WorkspaceSnapshot;

// Annotated per key so a generic name keeps the definition and its updater
// correlated, as useBudgetMutations does.
const definitions: {
  [K in OptimisticName]: {
    optimistic: Updater<K>;
    run: (store: Store, actor: Actor, input: BudgetInput<K>) => Promise<void>;
  };
} = budgetMutations;

type People = Awaited<ReturnType<typeof couple>>;

type Scenario<K extends OptimisticName> = {
  title: string;
  arrange: (
    store: Store,
    people: People,
  ) => Promise<{ actor: Actor; args: Args<K> }>;
};

type Scenarios = { [K in OptimisticName]: Scenario<K>[] };

// Fields the server owns or stamps with its own clock.
function comparable(row: Transaction) {
  const { updatedAt: _updatedAt, updatedBy: _updatedBy, split, ...rest } = row;

  return {
    ...rest,
    split: split && { paid: Boolean(split.paidAt), paidBy: split.paidBy },
  };
}

// The optimistic paint must agree with the server on every row it touches.
// The server may add rows (repayments, later occurrences) the client cannot
// mint ids for.
function gaps(
  before: WorkspaceSnapshot,
  painted: WorkspaceSnapshot,
  after: WorkspaceSnapshot,
) {
  const found: string[] = [];
  const served = new Map(after.budget.transactions.map((t) => [t.id, t]));
  const kept = new Set(painted.budget.transactions.map((t) => t.id));

  for (const row of painted.budget.transactions) {
    const server = served.get(row.id);

    if (!server) {
      found.push(`${row.id} is painted but not on the server`);
      continue;
    }

    const theirs = new Map(Object.entries(comparable(server)));

    for (const [key, value] of Object.entries(comparable(row)))
      if (!Bun.deepEquals(value, theirs.get(key)))
        found.push(
          `${row.id}.${key}: painted ${JSON.stringify(value)}, server ${JSON.stringify(theirs.get(key))}`,
        );
  }

  for (const row of before.budget.transactions)
    if (!kept.has(row.id) && served.has(row.id))
      found.push(`${row.id} is removed but still on the server`);

  return found;
}

async function parity<K extends OptimisticName>(
  store: Store,
  name: K,
  scenario: Scenario<K>,
  optimistic: Updater<K> = definitions[name].optimistic,
) {
  const people = await couple(store);
  const { actor, args } = await scenario.arrange(store, people);
  const before = await view(store, actor.user);
  const painted = optimistic(before, ...args);

  await definitions[name].run(store, actor, args[0]);

  return gaps(before, painted, await view(store, actor.user));
}

async function seeded(store: Store, people: People, row: Transaction) {
  const ana = await withHousehold(store, people.a.user);

  await store.saveTransaction(ana.user, ana.householdId, { transaction: row });

  const saved = (await view(store, ana.user)).budget.transactions.find(
    (t) => t.id === row.id,
  );

  if (!saved) throw new Error(`seed ${row.id} was not saved`);

  return { ana, saved };
}

const rent = { ...transaction("ana"), id: "rent", split: {} };

async function settledRent(store: Store, people: People) {
  const { saved } = await seeded(store, people, rent);
  const bia = await withHousehold(store, people.b.user);

  await store.settleSplit(bia.user, bia.householdId, {
    id: saved.id,
    revision: saved.revision ?? 0,
    date: "2026-09-20",
  });

  const settled = (await view(store, bia.user)).budget.transactions.find(
    (t) => t.id === saved.id,
  );

  if (!settled) throw new Error("settled rent missing");

  return { bia, settled };
}

const scenarios = {
  saveTransaction: [
    {
      title: "adds a transaction",
      arrange: async (store, people) => ({
        actor: await withHousehold(store, people.a.user),
        args: [{ transaction: { ...transaction("ana"), id: "new" } }],
      }),
    },
    {
      title: "edits the partner's transaction",
      arrange: async (store, people) => {
        const { saved } = await seeded(store, people, {
          ...transaction("ana"),
          id: "market",
        });

        return {
          actor: await withHousehold(store, people.b.user),
          args: [
            {
              transaction: {
                ...saved,
                description: "Feira",
                amount: cents(5000),
              },
            },
          ],
        };
      },
    },
  ],
  deleteTransaction: [
    {
      title: "deletes a transaction",
      arrange: async (store, people) => {
        const { ana, saved } = await seeded(store, people, transaction("ana"));

        return {
          actor: ana,
          args: [{ id: saved.id, revision: saved.revision ?? 0 }],
        };
      },
    },
  ],
  restoreTransaction: [
    {
      title: "restores a deleted transaction",
      arrange: async (store, people) => {
        const { ana, saved } = await seeded(store, people, transaction("ana"));

        await store.deleteTransaction(ana.user, ana.householdId, {
          id: saved.id,
          revision: saved.revision ?? 0,
        });

        return {
          actor: ana,
          args: [
            { id: saved.id, revision: (saved.revision ?? 0) + 1 },
            { transaction: saved },
          ],
        };
      },
    },
  ],
  settleSplit: [
    {
      title: "the partner who owes settles a split",
      arrange: async (store, people) => {
        const { saved } = await seeded(store, people, rent);

        return {
          actor: await withHousehold(store, people.b.user),
          args: [
            {
              id: saved.id,
              revision: saved.revision ?? 0,
              date: "2026-09-20",
            },
          ],
        };
      },
    },
  ],
  unsettleSplit: [
    {
      title: "the partner who settled undoes it",
      arrange: async (store, people) => {
        const { bia, settled } = await settledRent(store, people);

        return {
          actor: bia,
          args: [{ id: settled.id, revision: settled.revision ?? 0 }],
        };
      },
    },
  ],
} satisfies Scenarios;

describe("optimistic updates agree with the server", () => {
  const ctx = setupMemoryStore();
  const byName: Scenarios = scenarios;

  function suite<K extends OptimisticName>(name: K) {
    for (const scenario of byName[name])
      test(`${name}: ${scenario.title}`, async () => {
        expect(await parity(ctx.store, name, scenario)).toEqual([]);
      });
  }

  // SAFETY: `byName` is a record over exactly OptimisticName, so its keys
  // are those names.
  for (const name of Object.keys(byName) as OptimisticName[]) suite(name);

  test("a swapped updater with a compatible input fails parity", async () => {
    const [settle] = scenarios.settleSplit;

    expect(
      await parity(
        ctx.store,
        "settleSplit",
        settle,
        budgetMutations.unsettleSplit.optimistic,
      ),
    ).not.toEqual([]);
  });
});

// Rows saved before memberId existed: the server reads the owner from
// createdBy, and the optimistic paint must agree.
describe("legacy rows without a memberId", () => {
  let dir = "";
  let store: Store | undefined;
  let raw: StoreContext | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "twogether-parity-"));
    store = createStore(join(dir, "db.sqlite"));
    raw = createStoreContext(join(dir, "db.sqlite"));
  });

  afterEach(() => {
    store?.close();
    raw?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("saveTransaction: the partner edits a legacy row", async () => {
    if (!store || !raw) throw new Error("stores exist inside a test");

    const db = raw.db;

    const legacyEdit: Scenario<"saveTransaction"> = {
      title: "the partner edits a legacy row",
      arrange: async (current, people) => {
        await seeded(current, people, { ...transaction("ana"), id: "legacy" });
        await db.execute({
          sql: "UPDATE transactions SET payload = json_remove(payload, '$.memberId') WHERE id = ?",
          args: ["legacy"],
        });

        const bia = await withHousehold(current, people.b.user);

        const row = (await view(current, bia.user)).budget.transactions.find(
          (t) => t.id === "legacy",
        );

        if (!row) throw new Error("legacy row missing");

        return {
          actor: bia,
          args: [{ transaction: { ...row, description: "Feira" } }],
        };
      },
    };

    expect(await parity(store, "saveTransaction", legacyEdit)).toEqual([]);
  });
});

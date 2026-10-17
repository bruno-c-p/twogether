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
// correlated.
const definitions: {
  [K in OptimisticName]: {
    optimistic: Updater<K>;
    parse: (input: BudgetInput<K>) => BudgetInput<K>;
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

type Scenarios = {
  [K in OptimisticName]: [Scenario<K>, ...Scenario<K>[]];
};

// Fields the server owns or stamps with its own clock.
function comparable(row: Transaction) {
  const { updatedAt: _updatedAt, updatedBy: _updatedBy, split, ...rest } = row;

  return {
    ...rest,
    split: split && { paid: Boolean(split.paidAt), paidBy: split.paidBy },
  };
}

// The server may add rows (repayments, later occurrences) the client cannot
// mint ids for.
// Ids the input names (the row, a series' later occurrences).
function idsIn(input: BudgetInput<OptimisticName>) {
  return [...JSON.stringify(input).matchAll(/"id":"([^"]+)"/g)].map(
    ([, id]) => id,
  );
}

function fieldGaps(id: string, painted: Transaction, server: Transaction) {
  const mine = new Map(Object.entries(comparable(painted)));
  const theirs = new Map(Object.entries(comparable(server)));

  return [...new Set([...mine.keys(), ...theirs.keys()])].flatMap((key) =>
    Bun.deepEquals(mine.get(key), theirs.get(key))
      ? []
      : [
          `${id}.${key}: painted ${JSON.stringify(mine.get(key))}, server ${JSON.stringify(theirs.get(key))}`,
        ],
  );
}

// The server may add rows (repayments, later occurrences) the client cannot
// mint ids for; a row it already knew, or named in the input, must be painted.
function gaps(
  before: WorkspaceSnapshot,
  painted: WorkspaceSnapshot,
  after: WorkspaceSnapshot,
  named: string[],
) {
  const paint = new Map(painted.budget.transactions.map((t) => [t.id, t]));

  const found = painted.budget.transactions
    .filter((t, index, rows) => rows.findIndex((r) => r.id === t.id) !== index)
    .map((t) => `${t.id} is painted twice`);

  const served = new Map(after.budget.transactions.map((t) => [t.id, t]));

  const known = new Set([
    ...before.budget.transactions.map((t) => t.id),
    ...named,
  ]);

  for (const [id, row] of paint) {
    const server = served.get(id);

    if (server) found.push(...fieldGaps(id, row, server));
    else found.push(`${id} is painted but not on the server`);
  }

  for (const id of served.keys())
    if (!paint.has(id) && known.has(id))
      found.push(`${id} is on the server but not painted`);

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

  // The client paints its raw input; the server parses it first.
  await definitions[name].run(store, actor, definitions[name].parse(args[0]));

  return gaps(before, painted, await view(store, actor.user), idsIn(args[0]));
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
    {
      title: "deletes a series from its first occurrence onward",
      arrange: async (store, people) => {
        const ana = await withHousehold(store, people.a.user);

        await store.saveTransaction(ana.user, ana.householdId, {
          transaction: { ...transaction("ana"), id: "rent-series" },
          occurrences: 3,
        });

        const [first, ...later] = (
          await view(store, ana.user)
        ).budget.transactions
          .filter((t) => t.recurrenceId)
          .sort((a, b) => (a.recurrenceIndex ?? 0) - (b.recurrenceIndex ?? 0));

        if (!first) throw new Error("series missing");

        return {
          actor: ana,
          args: [
            {
              id: first.id,
              revision: first.revision ?? 0,
              following: later.map((t) => ({
                id: t.id,
                revision: t.revision ?? 0,
              })),
            },
          ],
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

  test("an updater that paints nothing fails parity", async () => {
    const [restore] = scenarios.restoreTransaction;

    expect(
      await parity(
        ctx.store,
        "restoreTransaction",
        restore,
        (snapshot) => snapshot,
      ),
    ).toEqual([`${transaction("ana").id} is on the server but not painted`]);
  });

  test("an updater that keeps the stale row next to the edit fails parity", async () => {
    const [, edit] = scenarios.saveTransaction;

    const appended = await parity(
      ctx.store,
      "saveTransaction",
      edit,
      (snapshot, input) => ({
        ...snapshot,
        budget: {
          ...snapshot.budget,
          transactions: [...snapshot.budget.transactions, input.transaction],
        },
      }),
    );

    expect(appended).toContain("market is painted twice");
  });

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

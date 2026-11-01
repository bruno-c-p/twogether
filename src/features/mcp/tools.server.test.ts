import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import type { Store } from "@/server/store.server";
import { createBudgetMcpServer } from "@/features/mcp/tools.server";
import {
  couple,
  setupMemoryStore,
  signup,
  view,
} from "@/server/store-test-harness";

const ctx = setupMemoryStore();

const resultText = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
  isError: z.boolean().optional(),
});

const versioned = z.object({ id: z.string(), revision: z.number() });

type Versioned = z.infer<typeof versioned>;

const savedRow = z.object({
  id: z.string(),
  revision: z.number(),
  description: z.string(),
  amount: z.object({ cents: z.number(), formatted: z.string() }),
  memberName: z.string().optional(),
  kind: z.enum(["expense", "income", "transfer"]),
  goal: z.string().nullable(),
  split: z.object({ paid: z.boolean() }).optional(),
});

async function connect(store: Store, userId: string) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await createBudgetMcpServer(store, userId).connect(serverSide);
  await client.connect(clientSide);

  async function call(
    name: string,
    args: Record<
      string,
      | string
      | number
      | boolean
      | string[]
      | null
      | Record<string, number>
      | Versioned[]
    > = {},
  ) {
    const result = resultText.parse(
      await client.callTool({ name, arguments: args }),
    );

    const text = result.content.map((item) => item.text).join("\n");

    return { error: result.isError === true, text };
  }

  async function ok<Output>(
    name: string,
    schema: z.ZodType<Output>,
    args: Parameters<typeof call>[1] = {},
  ) {
    const result = await call(name, args);

    if (result.error) throw new Error(`${name} failed: ${result.text}`);

    return schema.parse(JSON.parse(result.text));
  }

  return { client, call, ok };
}

const groceries = {
  description: "Mercado",
  amount: 12345,
  date: "2026-09-14",
  goal: "fixed",
};

describe("budget MCP tools", () => {
  test("lists every tool with read-only hints on reads", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { client } = await connect(store, a.user.id);
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "delete_transaction",
      "get_goal_percentages",
      "get_overview",
      "list_transactions",
      "restore_transaction",
      "save_goal_percentages",
      "save_transaction",
      "settle_split",
      "unsettle_split",
    ]);

    const hints = Object.fromEntries(
      tools.map((tool) => [tool.name, tool.annotations?.readOnlyHint]),
    );

    expect(hints.get_overview).toBe(true);
    expect(hints.list_transactions).toBe(true);
    expect(hints.delete_transaction).toBe(false);
  });

  test("asks people without a household to finish signing up", async () => {
    const { store } = ctx;
    const solo = await signup(store, "Cris");
    const { call } = await connect(store, solo.user.id);
    const result = await call("get_overview", { month: "2026-09" });

    expect(result.error).toBe(true);
    expect(result.text).toContain("Termine o cadastro");
  });

  test("answers with the setup message before validating a draft", async () => {
    const { store } = ctx;
    const solo = await signup(store, "Cris");
    const { call } = await connect(store, solo.user.id);

    const result = await call("save_transaction", {
      description: "Mercado",
      amount: 100,
      goal: null,
    });

    expect(result.error).toBe(true);
    expect(result.text).toContain("Termine o cadastro");
  });

  test("adds, edits, deletes, and restores a transaction", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { call, ok } = await connect(store, a.user.id);
    const saved = z.object({ saved: savedRow });

    const created = (await ok("save_transaction", saved, groceries)).saved;
    expect(created.memberName).toBe("Ana");
    expect(created.amount.formatted).toContain("123,45");

    const edited = (
      await ok("save_transaction", saved, {
        id: created.id,
        revision: created.revision,
        amount: 5000,
      })
    ).saved;

    expect(edited.description).toBe("Mercado");
    expect(edited.amount.cents).toBe(5000);

    const stale = await call("save_transaction", {
      id: created.id,
      revision: created.revision,
      amount: 6000,
    });

    expect(stale.error).toBe(true);
    expect(stale.text).toContain("mudou no outro dispositivo");

    const deleted = await ok(
      "delete_transaction",
      z.object({ undo: z.array(versioned) }),
      { id: edited.id, revision: edited.revision },
    );

    expect((await view(store, a.user)).budget.transactions).toHaveLength(0);

    await ok(
      "restore_transaction",
      z.object({ restored: savedRow }),
      deleted.undo[0],
    );

    expect((await view(store, a.user)).budget.transactions).toHaveLength(1);
  });

  test("drops the goal and split when an expense becomes income", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { ok } = await connect(store, a.user.id);
    const saved = z.object({ saved: savedRow });

    const shared = (
      await ok("save_transaction", saved, { ...groceries, split: true })
    ).saved;

    expect(shared.split?.paid).toBe(false);

    const income = (
      await ok("save_transaction", saved, {
        id: shared.id,
        revision: shared.revision,
        kind: "income",
      })
    ).saved;

    expect(income.kind).toBe("income");
    expect(income.goal).toBeNull();
    expect(income.split).toBeUndefined();
  });

  test("deletes and restores the later occurrences the agent saw", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await connect(store, a.user.id);
    const bia = await connect(store, b.user.id);
    const row = savedRow.extend({ recurrence: z.object({ id: z.string() }) });
    const listed = z.object({ count: z.number(), transactions: z.array(row) });

    const { saved } = await ana.ok(
      "save_transaction",
      z.object({ saved: row }),
      { ...groceries, occurrences: 3 },
    );

    const series = await ana.ok("list_transactions", listed, {
      recurrence: saved.recurrence.id,
    });

    expect(series.count).toBe(3);

    const later = series.transactions
      .filter((item) => item.id !== saved.id)
      .map(({ id, revision }) => ({ id, revision }));

    await bia.ok("save_transaction", z.object({ saved: row }), {
      ...later[0],
      amount: 999,
    });

    const stale = await ana.call("delete_transaction", {
      id: saved.id,
      revision: saved.revision,
      following: later,
    });

    expect(stale.error).toBe(true);
    expect(stale.text).toContain("mudou no outro dispositivo");
    expect((await view(store, a.user)).budget.transactions).toHaveLength(3);

    const fresh = await ana.ok("list_transactions", listed, {
      recurrence: saved.recurrence.id,
    });

    const following = fresh.transactions
      .filter((item) => item.id !== saved.id)
      .map(({ id, revision }) => ({ id, revision }));

    const { undo } = await ana.ok(
      "delete_transaction",
      z.object({ undo: z.array(versioned) }),
      { id: saved.id, revision: saved.revision, following },
    );

    expect(undo).toHaveLength(3);
    expect((await view(store, a.user)).budget.transactions).toHaveLength(0);

    for (const item of undo)
      await ana.ok("restore_transaction", z.object({ restored: row }), item);

    expect((await view(store, a.user)).budget.transactions).toHaveLength(3);
  });

  test("rejects invalid input with the app's messages", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { call, ok } = await connect(store, a.user.id);

    const noGoal = await call("save_transaction", { ...groceries, goal: null });
    expect(noGoal.error).toBe(true);
    expect(noGoal.text).toContain("Escolha uma meta");

    const missing = await call("save_transaction", {
      id: "missing",
      amount: 10,
    });

    expect(missing.error).toBe(true);
    expect(missing.text).toContain("Transação não encontrada");

    const { saved } = await ok(
      "save_transaction",
      z.object({ saved: savedRow }),
      groceries,
    );

    const noRevision = await call("save_transaction", {
      id: saved.id,
      amount: 10,
    });

    expect(noRevision.error).toBe(true);
    expect(noRevision.text).toContain("Informe a revision");
  });

  test("files a transfer under freedom and lists it apart from expenses", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { ok } = await connect(store, a.user.id);
    const saved = z.object({ saved: savedRow });
    const list = z.object({ transactions: z.array(savedRow) });

    await ok("save_transaction", saved, groceries);

    const transfer = (
      await ok("save_transaction", saved, {
        description: "Tesouro Direto",
        amount: 50000,
        date: "2026-09-14",
        kind: "transfer",
      })
    ).saved;

    expect(transfer.goal).toBe("freedom");

    const listed = await ok("list_transactions", list, {
      month: "2026-09",
      kind: "transfer",
    });

    expect(listed.transactions.map((t) => t.description)).toEqual([
      "Tesouro Direto",
    ]);
  });

  test("a null goal means the kind's goal, and a new kind drops the old goal", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { call, ok } = await connect(store, a.user.id);
    const saved = z.object({ saved: savedRow });

    const created = (
      await ok("save_transaction", saved, {
        description: "Tesouro Direto",
        amount: 50000,
        kind: "transfer",
        goal: null,
      })
    ).saved;

    const edited = (
      await ok("save_transaction", saved, {
        id: created.id,
        revision: created.revision,
        goal: null,
      })
    ).saved;

    expect([created.goal, edited.goal]).toEqual(["freedom", "freedom"]);

    const expense = await call("save_transaction", {
      id: edited.id,
      revision: edited.revision,
      kind: "expense",
    });

    expect(expense).toEqual({
      error: true,
      text: "Escolha uma meta para esta despesa.",
    });
  });

  test("refuses a new freedom expense, split or not, and points at Transferência", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { call } = await connect(store, a.user.id);

    for (const split of [true, false]) {
      const result = await call("save_transaction", {
        ...groceries,
        goal: "freedom",
        split,
      });

      expect(result).toEqual({
        error: true,
        text: "Use Transferência para Liberdade financeira.",
      });
    }
  });

  test("filters the month and computes the overview per member", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await connect(store, a.user.id);
    const bia = await connect(store, b.user.id);
    const saved = z.object({ saved: savedRow });

    await ana.ok("save_transaction", saved, {
      description: "Salário",
      amount: 100000,
      date: "2026-09-05",
      kind: "income",
      goal: null,
    });
    await ana.ok("save_transaction", saved, groceries);
    await bia.ok("save_transaction", saved, {
      ...groceries,
      description: "Cinema",
      goal: "pleasure",
    });
    await bia.ok("save_transaction", saved, {
      ...groceries,
      description: "Outro mês",
      date: "2026-10-01",
    });

    const list = z.object({
      count: z.number(),
      transactions: z.array(savedRow),
    });

    const september = await ana.ok("list_transactions", list, {
      month: "2026-09",
    });

    expect(september.count).toBe(3);

    const anaOnly = await ana.ok("list_transactions", list, {
      month: "2026-09",
      member: a.user.id,
      kind: "expense",
    });

    expect(anaOnly.transactions.map((t) => t.description)).toEqual(["Mercado"]);

    const search = await ana.ok("list_transactions", list, {
      month: "2026-09",
      query: "prazer",
    });

    expect(search.transactions.map((t) => t.description)).toEqual(["Cinema"]);

    const overview = await ana.ok(
      "get_overview",
      z.object({
        income: z.object({ cents: z.number() }),
        expenses: z.object({ cents: z.number() }),
        goals: z.array(
          z.object({
            id: z.string(),
            planned: z.object({ cents: z.number() }),
            spent: z.object({ cents: z.number() }),
          }),
        ),
      }),
      { month: "2026-09" },
    );

    expect(overview.income.cents).toBe(100000);
    expect(overview.expenses.cents).toBe(24690);

    const fixed = overview.goals.find((goal) => goal.id === "fixed");
    expect(fixed?.planned.cents).toBe(30000);
    expect(fixed?.spent.cents).toBe(12345);

    const unknown = await ana.call("list_transactions", {
      month: "2026-09",
      member: "someone-else",
    });

    expect(unknown.error).toBe(true);
  });

  test("keeps each household's data apart", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const other = await signup(store, "Duda");
    await store.createHousehold(other.user);
    const ana = await connect(store, a.user.id);
    const duda = await connect(store, other.user.id);

    const created = (
      await ana.ok("save_transaction", z.object({ saved: savedRow }), groceries)
    ).saved;

    const list = await duda.ok(
      "list_transactions",
      z.object({ count: z.number() }),
      { month: "2026-09" },
    );

    expect(list.count).toBe(0);

    const edit = await duda.call("save_transaction", {
      id: created.id,
      revision: created.revision,
      amount: 1,
    });

    expect(edit.error).toBe(true);
  });

  test("lets only the partner who owes settle a split", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const ana = await connect(store, a.user.id);
    const bia = await connect(store, b.user.id);

    const rent = (
      await ana.ok("save_transaction", z.object({ saved: savedRow }), {
        ...groceries,
        description: "Aluguel",
        amount: 200001,
        split: true,
      })
    ).saved;

    const own = await ana.call("settle_split", {
      id: rent.id,
      revision: rent.revision,
    });

    expect(own.error).toBe(true);
    expect(own.text).toContain("Só quem deve");

    const settled = await bia.ok(
      "settle_split",
      z.object({ settled: savedRow }),
      { id: rent.id, revision: rent.revision, date: "2026-09-20" },
    );

    expect(settled.settled.split?.paid).toBe(true);
    expect((await view(store, a.user)).budget.transactions).toHaveLength(3);

    await bia.ok("unsettle_split", z.object({ unsettled: savedRow }), {
      id: rent.id,
      revision: settled.settled.revision,
    });

    expect((await view(store, a.user)).budget.transactions).toHaveLength(1);
  });

  test("drops the goal and split when an expense becomes income", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { ok } = await connect(store, a.user.id);
    const saved = z.object({ saved: savedRow });

    const shared = (
      await ok("save_transaction", saved, { ...groceries, split: true })
    ).saved;

    expect(shared.split?.paid).toBe(false);

    const income = (
      await ok("save_transaction", saved, {
        id: shared.id,
        revision: shared.revision,
        kind: "income",
      })
    ).saved;

    expect(income.kind).toBe("income");
    expect(income.goal).toBeNull();
    expect(income.split).toBeUndefined();
  });

  test("changes only your own goal percentages", async () => {
    const { store } = ctx;
    const { a } = await couple(store);
    const { ok, call } = await connect(store, a.user.id);

    const percentages = z.object({
      members: z.array(
        z.object({
          id: z.string(),
          editable: z.boolean(),
          revision: z.number(),
          percentages: z.record(z.string(), z.number()),
        }),
      ),
    });

    const before = await ok("get_goal_percentages", percentages);
    const mine = before.members.find((member) => member.editable);
    expect(before.members).toHaveLength(2);

    const next = {
      fixed: 40,
      pleasure: 10,
      comfort: 10,
      targets: 10,
      knowledge: 5,
      freedom: 25,
    };

    const after = await ok("save_goal_percentages", percentages, {
      percentages: next,
      revision: mine?.revision ?? 0,
    });

    expect(after.members.find((m) => m.id === a.user.id)?.percentages).toEqual(
      next,
    );

    const wrongSum = await call("save_goal_percentages", {
      percentages: { ...next, fixed: 50 },
      revision: 0,
    });

    expect(wrongSum.error).toBe(true);
  });

  describe("on a server running in UTC at 23:30 in São Paulo", () => {
    const processZone = process.env.TZ;

    afterEach(() => {
      setSystemTime();
      process.env.TZ = processZone;
    });

    test("defaults to São Paulo's date and month", async () => {
      process.env.TZ = "UTC";
      setSystemTime(new Date("2026-10-31T23:30:00-03:00"));

      const { store } = ctx;
      const { a } = await couple(store);
      const { ok } = await connect(store, a.user.id);

      const { saved } = await ok(
        "save_transaction",
        z.object({ saved: z.object({ date: z.string() }) }),
        { description: "Padaria", amount: 1500, goal: "fixed" },
      );

      const { month } = await ok(
        "get_overview",
        z.object({ month: z.string() }),
      );

      expect(saved.date).toBe("2026-10-31");
      expect(month).toBe("2026-10");
    });
  });
});

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Store } from "@/server/store.server";
import {
  centsSchema,
  dateSchema,
  descriptionSchema,
  followingSchema,
  goalIdSchema,
  goalPercentagesSchema,
  idSchema,
  KIND_GOAL,
  monthSchema,
  occurrencesSchema,
  revisionSchema,
  transactionKindSchema,
} from "@/features/budget/domain/schemas";
import type {
  Transaction,
  TransactionDraft,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import {
  describeTransaction,
  goalPercentages,
  listTransactions,
  overview,
} from "@/features/mcp/budget-view";
import { currentMonth, today } from "@/lib/clock";
import { reportError } from "@/lib/errors";
import { budgetMutations } from "@/features/budget/registry";
import {
  writeTool,
  type WriteSession,
  type WriteTool,
} from "@/features/mcp/write-tool.server";
import { assertWritable, householdActor } from "@/server/actor.server";
import type { ActorFor } from "@/server/mutation";
import {
  errorForLogs,
  RequestError,
  UNEXPECTED_MESSAGE,
} from "@/server/request-error";

// Households store no time zone and an MCP request carries no browser cookie,
// so "today" and the default month follow the app's home market.
const HOUSEHOLD_TIME_ZONE = "America/Sao_Paulo";

const SETUP_REQUIRED =
  "Termine o cadastro no twogether antes de usar o agente: escolha seu nome e crie um orçamento ou aceite um convite.";

const INSTRUCTIONS = `twogether is a shared budget for a couple. Amounts are integer cents in BRL (R$ 45,90 = 4590). Dates are YYYY-MM-DD and months YYYY-MM.
Expenses belong to one of five goals (fixed, pleasure, comfort, targets, knowledge); income has no goal; transfers are money moved into savings or investments, always go to the sixth goal, freedom, and do not count as spending. Record anything for freedom as a transfer. Some older split expenses still carry freedom; they keep it when edited, but no new expense can take it. Each person's income is split across the goals by their own percentages, which sum to 100.
Every transaction has a revision: pass the latest one from list_transactions when editing, deleting, or settling. A stale revision means your partner changed it; list again before retrying.
A split expense makes the partner owe half; only the person who owes can settle it.`;

const memberFilter = z
  .string()
  .min(1)
  .max(64)
  .optional()
  .describe(
    "Member id from get_overview to see one person's own transactions. Omit for the couple's shared view.",
  );

const monthFilter = z
  .optional(monthSchema)
  .describe("Month as YYYY-MM. Defaults to the current month.");

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

const write = { readOnlyHint: false, openWorldHint: false } as const;

type SaveInput = {
  id?: string;
  revision?: number;
  description?: string;
  amount?: number;
  date?: string;
  kind?: Transaction["kind"];
  goal?: Transaction["goal"];
  split?: boolean;
  occurrences?: number;
};

function success<Result>(result: Result): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function failure(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function run<Result>(task: () => Promise<Result>) {
  try {
    return success(await task());
  } catch (cause) {
    if (cause instanceof RequestError) return failure(cause.message);

    reportError(errorForLogs(cause), { context: "MCP tool failed" });

    return failure(UNEXPECTED_MESSAGE);
  }
}

function rejected(message: string): never {
  throw new RequestError(message);
}

function findTransaction(snapshot: WorkspaceSnapshot, id: string) {
  const found = snapshot.budget.transactions.find((t) => t.id === id);

  if (!found)
    throw new RequestError(
      "Transação não encontrada. Use list_transactions para conferir o id.",
    );

  return found;
}

function createdTransaction(input: SaveInput): TransactionDraft {
  const kind = input.kind ?? "expense";

  return {
    id: randomUUID(),
    description: input.description ?? "",
    amount: input.amount ?? 0,
    date: input.date ?? today(HOUSEHOLD_TIME_ZONE),
    kind,
    goal: input.goal ?? KIND_GOAL[kind],
    split: input.split ? {} : undefined,
  };
}

function editRevision(input: SaveInput) {
  if (input.revision === undefined)
    throw new RequestError(
      "Informe a revision atual de list_transactions para editar.",
    );

  if (input.occurrences !== undefined && input.occurrences !== 1)
    throw new RequestError("Edite cada ocorrência individualmente.");

  return input.revision;
}

function editedGoal(
  previous: Transaction,
  input: SaveInput,
  kind: Transaction["kind"],
) {
  if (input.goal !== undefined) return input.goal;

  return kind === "expense" ? previous.goal : KIND_GOAL[kind];
}

// Like the goal, a split is dropped when an expense becomes income.
function editedSplit(
  previous: Transaction,
  input: SaveInput,
  kind: Transaction["kind"],
) {
  if (!(input.split ?? (kind === "expense" && previous.split)))
    return undefined;

  return previous.split ?? {};
}

function editedTransaction(
  previous: Transaction,
  input: SaveInput,
): TransactionDraft {
  const kind = input.kind ?? previous.kind;

  return {
    ...previous,
    description: input.description ?? previous.description,
    amount: input.amount ?? previous.amount,
    date: input.date ?? previous.date,
    kind,
    goal: editedGoal(previous, input, kind),
    split: editedSplit(previous, input, kind),
    revision: editRevision(input),
  };
}

type Actor = ActorFor<"household">;

async function snapshotOf(session: WriteSession) {
  const { user, householdId } = await session.actor();

  return session.store.snapshot(user, householdId);
}

async function described(session: WriteSession, id: string) {
  const snapshot = await snapshotOf(session);

  return describeTransaction(snapshot, findTransaction(snapshot, id));
}

type Mutations = typeof budgetMutations;

type BudgetTools = {
  [K in keyof Mutations]: WriteTool<K> | null;
};

const idRevision = { id: idSchema, revision: revisionSchema };

const budgetTools = {
  saveTransaction: writeTool(budgetMutations.saveTransaction, {
    tool: "save_transaction",
    title: "Add or edit a transaction",
    description:
      "Without id, adds a transaction for you (description and amount required; kind defaults to expense, date to today; expenses need a goal; transfers go to freedom). With id and revision, edits it; omitted fields keep their current value. Repayments and paid splits are locked.",
    annotations: { ...write, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      id: z.optional(idSchema).describe("Existing transaction id to edit."),
      revision: z
        .optional(revisionSchema)
        .describe("Current revision, required when editing."),
      description: z.optional(descriptionSchema),
      amount: z
        .optional(centsSchema)
        .describe("Integer cents: R$ 45,90 is 4590."),
      date: z.optional(dateSchema).describe("YYYY-MM-DD."),
      kind: z.optional(transactionKindSchema),
      goal: z
        .nullable(goalIdSchema)
        .optional()
        .describe(
          "Required for expenses; null for income; freedom for transfers, filled in when omitted.",
        ),
      split: z
        .boolean()
        .optional()
        .describe("Expense only: the partner owes half."),
      occurrences: z
        .optional(occurrencesSchema)
        .describe(
          "New transactions only: repeat monthly this many times (1-120).",
        ),
    },
    input: async (args, session) => {
      if (!args.id && args.revision !== undefined)
        throw new RequestError("Informe o id da transação para editar.");

      const previous = args.id
        ? findTransaction(await snapshotOf(session), args.id)
        : undefined;

      return {
        transaction: previous
          ? editedTransaction(previous, args)
          : createdTransaction(args),
        occurrences: args.id ? undefined : args.occurrences,
      };
    },
    output: async (session, input) => ({
      saved: await described(session, input.transaction.id),
    }),
  }),
  deleteTransaction: writeTool(budgetMutations.deleteTransaction, {
    tool: "delete_transaction",
    title: "Delete a transaction",
    description:
      "Deletes a transaction. Returns the id and revision of every deleted transaction to pass to restore_transaction to undo it.",
    annotations: { ...write, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      ...idRevision,
      following: z
        .optional(followingSchema)
        .describe(
          "Also delete the later occurrences of its recurring series: every one of them with the revision from list_transactions with recurrence.",
        ),
    },
    input: (args) => args,
    output: (_session, { id, revision, following }) => ({
      undo: [{ id, revision }, ...(following ?? [])].map((item) => ({
        id: item.id,
        revision: item.revision + 1,
      })),
    }),
  }),
  restoreTransaction: writeTool(budgetMutations.restoreTransaction, {
    tool: "restore_transaction",
    title: "Restore a deleted transaction",
    description:
      "Undoes delete_transaction with the id and revision it returned.",
    annotations: { ...write, destructiveHint: false, idempotentHint: false },
    inputSchema: idRevision,
    input: (args) => args,
    output: async (session, { id }) => ({
      restored: await described(session, id),
    }),
  }),
  settleSplit: writeTool(budgetMutations.settleSplit, {
    tool: "settle_split",
    title: "Mark a split expense as paid",
    description:
      "Marks your half of a split expense your partner paid as repaid, recording an income for them and an expense for you. Only the person who owes can settle.",
    annotations: { ...write, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      ...idRevision,
      date: z
        .optional(dateSchema)
        .describe("Payment date, YYYY-MM-DD. Defaults to today."),
    },
    input: ({ id, revision, date }) => ({
      id,
      revision,
      date: date ?? today(HOUSEHOLD_TIME_ZONE),
    }),
    output: async (session, { id }) => ({
      settled: await described(session, id),
    }),
  }),
  unsettleSplit: writeTool(budgetMutations.unsettleSplit, {
    tool: "unsettle_split",
    title: "Undo a split payment",
    description:
      "Unmarks a settled split expense and removes its repayment entries.",
    annotations: { ...write, destructiveHint: true, idempotentHint: false },
    inputSchema: idRevision,
    input: (args) => args,
    output: async (session, { id }) => ({
      unsettled: await described(session, id),
    }),
  }),
  savePercentages: writeTool(budgetMutations.savePercentages, {
    tool: "save_goal_percentages",
    title: "Change your goal percentages",
    description:
      "Replaces your own percentages for all six goals. Values must sum to 100.",
    annotations: { ...write, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      percentages: goalPercentagesSchema,
      revision: revisionSchema.check(
        z.describe("Your current revision from get_goal_percentages."),
      ),
    },
    input: (args) => args,
    output: async (session) => goalPercentages(await snapshotOf(session)),
  }),
} satisfies BudgetTools;

export function createBudgetMcpServer(store: Store, userId: string) {
  const server = new McpServer(
    { name: "twogether", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );

  async function member() {
    const user = await store.ensureUser(userId);

    if (!user.name || !user.household_id)
      throw new RequestError(SETUP_REQUIRED);

    return householdActor(user);
  }

  async function workspace() {
    const { user, householdId } = await member();

    return store.snapshot(user, householdId);
  }

  // Rate-limited before any read, keyed like the app's rate limit middleware.
  function session(): WriteSession {
    let actor: Promise<Actor> | undefined;

    return {
      store,
      actor: () =>
        (actor ??= Promise.resolve().then(() => {
          assertWritable(userId);

          return member();
        })),
    };
  }

  server.registerTool(
    "get_overview",
    {
      title: "Budget overview",
      description:
        "Month totals, each goal's planned vs. spent amount, the split-expense balance between the couple, and the members.",
      inputSchema: { month: monthFilter, member: memberFilter },
      annotations: readOnly,
    },
    ({ month, member }) =>
      run(async () =>
        overview(
          await workspace(),
          month ?? currentMonth(HOUSEHOLD_TIME_ZONE),
          member,
          today(HOUSEHOLD_TIME_ZONE),
        ),
      ),
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List transactions",
      description:
        "Transactions of one month, newest first, with the id and revision needed to edit them.",
      inputSchema: {
        month: monthFilter,
        member: memberFilter,
        kind: z
          .enum(["expense", "income", "transfer", "split"])
          .optional()
          .describe("Only expenses, income, transfers, or split expenses."),
        goal: z.optional(goalIdSchema),
        query: z
          .string()
          .max(200)
          .optional()
          .describe("Text to find in the description or goal name."),
        recurrence: z
          .optional(idSchema)
          .describe(
            "A recurrence id: lists that whole series across every month instead of one month.",
          ),
      },
      annotations: readOnly,
    },
    ({ month, ...filters }) =>
      run(async () =>
        listTransactions(await workspace(), {
          ...filters,
          month: month ?? currentMonth(HOUSEHOLD_TIME_ZONE),
        }),
      ),
  );

  server.registerTool(
    "get_goal_percentages",
    {
      title: "Goal percentages",
      description:
        "Each member's split of their income across the six goals, with the revision needed to change your own.",
      annotations: readOnly,
    },
    () => run(async () => goalPercentages(await workspace())),
  );

  for (const tool of Object.values(budgetTools))
    tool?.({ server, session, run, rejected });

  return server;
}

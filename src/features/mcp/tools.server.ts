import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { BudgetStore } from "@/features/budget/budget.server";
import {
  currentMonth,
  localDate,
  normalizeTag,
} from "@/features/budget/domain/format";
import {
  dateSchema,
  followingSchema,
  goalIdSchema,
  goalPercentagesSchema,
  idSchema,
  monthSchema,
  occurrencesSchema,
  revisionSchema,
  transactionKindSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import {
  describeTransaction,
  goalPercentages,
  listTransactions,
  overview,
} from "@/features/mcp/budget-view";
import { reportError } from "@/lib/errors";
import { firstIssueMessage } from "@/lib/zod-errors";
import type { UserRow } from "@/server/db.server";
import { consumeRateLimit } from "@/server/rate-limit.server";
import { errorForLogs, RequestError } from "@/server/request-error";

const UNEXPECTED = "Não foi possível concluir. Tente novamente.";

const SETUP_REQUIRED =
  "Termine o cadastro no twogether antes de usar o agente: escolha seu nome e crie um orçamento ou aceite um convite.";

const RATE_LIMITED =
  "Muitas alterações em pouco tempo. Aguarde um instante e tente novamente.";

const INSTRUCTIONS = `twogether is a shared budget for a couple. Amounts are integer cents in BRL (R$ 45,90 = 4590). Dates are YYYY-MM-DD and months YYYY-MM.
Expenses belong to one of six goals (fixed, pleasure, comfort, targets, knowledge, freedom); income has no goal. Each person's income is split across the goals by their own percentages, which sum to 100.
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

const monthFilter = monthSchema
  .optional()
  .describe("Month as YYYY-MM. Defaults to the current month.");

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

const write = { readOnlyHint: false, openWorldHint: false } as const;

interface Workspace {
  snapshot: WorkspaceSnapshot;
  user: UserRow;
  householdId: string;
}

type SaveInput = {
  id?: string;
  revision?: number;
  description?: string;
  amount?: number;
  date?: string;
  kind?: Transaction["kind"];
  goal?: Transaction["goal"];
  tags?: string[];
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

    return failure(UNEXPECTED);
  }
}

function validated<Output>(schema: z.ZodType<Output>, value: Output): Output {
  const result = schema.safeParse(value);

  if (!result.success) throw new RequestError(firstIssueMessage(result.error));

  return result.data;
}

function findTransaction(snapshot: WorkspaceSnapshot, id: string) {
  const found = snapshot.budget.transactions.find((t) => t.id === id);

  if (!found)
    throw new RequestError(
      "Transação não encontrada. Use list_transactions para conferir o id.",
    );

  return found;
}

function tagsFrom(values: string[]) {
  return [...new Set(values.map(normalizeTag))].filter(Boolean);
}

function createdTransaction(input: SaveInput): Transaction {
  return {
    id: randomUUID(),
    description: input.description ?? "",
    amount: input.amount ?? 0,
    date: input.date ?? localDate(),
    kind: input.kind ?? "expense",
    goal: input.goal ?? null,
    tags: tagsFrom(input.tags ?? []),
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

  return kind === "income" ? null : previous.goal;
}

function editedSplit(previous: Transaction, input: SaveInput) {
  if (!(input.split ?? previous.split)) return undefined;

  return previous.split ?? {};
}

function editedTransaction(
  previous: Transaction,
  input: SaveInput,
): Transaction {
  const kind = input.kind ?? previous.kind;

  return {
    ...previous,
    description: input.description ?? previous.description,
    amount: input.amount ?? previous.amount,
    date: input.date ?? previous.date,
    kind,
    goal: editedGoal(previous, input, kind),
    tags: input.tags ? tagsFrom(input.tags) : previous.tags,
    split: editedSplit(previous, input),
    revision: editRevision(input),
  };
}

export function createBudgetMcpServer(store: BudgetStore, userId: string) {
  const server = new McpServer(
    { name: "twogether", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );

  async function workspace(): Promise<Workspace> {
    const user = await store.ensureUser(userId);

    if (!user.name || !user.household_id)
      throw new RequestError(SETUP_REQUIRED);

    return {
      user,
      householdId: user.household_id,
      snapshot: await store.snapshot(user, user.household_id),
    };
  }

  async function writable() {
    const current = await workspace();

    if (!consumeRateLimit(current.user.id).ok)
      throw new RequestError(RATE_LIMITED, 429);

    return current;
  }

  server.registerTool(
    "get_overview",
    {
      title: "Budget overview",
      description:
        "Month totals, each goal's planned vs. spent amount, the split-expense balance between the couple, the members, and all tags in use.",
      inputSchema: { month: monthFilter, member: memberFilter },
      annotations: readOnly,
    },
    ({ month, member }) =>
      run(async () =>
        overview((await workspace()).snapshot, month ?? currentMonth(), member),
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
          .enum(["expense", "income", "split"])
          .optional()
          .describe("Only expenses, income, or split expenses."),
        goal: goalIdSchema.optional(),
        tag: z.string().max(24).optional(),
        query: z
          .string()
          .max(200)
          .optional()
          .describe("Text to find in the description, tags, or goal name."),
        recurrence: idSchema
          .optional()
          .describe(
            "A recurrence id: lists that whole series across every month instead of one month.",
          ),
      },
      annotations: readOnly,
    },
    ({ month, ...filters }) =>
      run(async () =>
        listTransactions((await workspace()).snapshot, {
          ...filters,
          month: month ?? currentMonth(),
        }),
      ),
  );

  server.registerTool(
    "save_transaction",
    {
      title: "Add or edit a transaction",
      description:
        "Without id, adds a transaction for you (description and amount required; kind defaults to expense, date to today; expenses need a goal). With id and revision, edits it; omitted fields keep their current value. Repayments and paid splits are locked.",
      inputSchema: {
        id: idSchema.optional().describe("Existing transaction id to edit."),
        revision: revisionSchema
          .optional()
          .describe("Current revision, required when editing."),
        description: z.string().max(80).optional(),
        amount: z
          .int()
          .min(1)
          .optional()
          .describe("Integer cents: R$ 45,90 is 4590."),
        date: dateSchema.optional().describe("YYYY-MM-DD."),
        kind: transactionKindSchema.optional(),
        goal: goalIdSchema
          .nullable()
          .optional()
          .describe("Required for expenses; null for income."),
        tags: z.array(z.string().max(24)).max(8).optional(),
        split: z
          .boolean()
          .optional()
          .describe("Expense only: the partner owes half."),
        occurrences: occurrencesSchema
          .optional()
          .describe(
            "New transactions only: repeat monthly this many times (1-120).",
          ),
      },
      annotations: { ...write, destructiveHint: false, idempotentHint: false },
    },
    (input) =>
      run(async () => {
        if (!input.id && input.revision !== undefined)
          throw new RequestError("Informe o id da transação para editar.");

        const { snapshot, user, householdId } = await writable();

        const transaction = validated(
          transactionSchema,
          input.id
            ? editedTransaction(findTransaction(snapshot, input.id), input)
            : createdTransaction(input),
        );

        await store.saveTransaction(user, householdId, {
          transaction,
          occurrences: input.id ? undefined : input.occurrences,
        });

        const saved = await store.snapshot(user, householdId);

        return {
          saved: describeTransaction(
            saved,
            findTransaction(saved, transaction.id),
          ),
        };
      }),
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete a transaction",
      description:
        "Deletes a transaction. Returns the id and revision of every deleted transaction to pass to restore_transaction to undo it.",
      inputSchema: {
        id: idSchema,
        revision: revisionSchema,
        following: followingSchema
          .optional()
          .describe(
            "Also delete the later occurrences of its recurring series: every one of them with the revision from list_transactions with recurrence.",
          ),
      },
      annotations: { ...write, destructiveHint: true, idempotentHint: false },
    },
    ({ id, revision, following }) =>
      run(async () => {
        const { user, householdId } = await writable();

        await store.deleteTransaction(user, householdId, {
          id,
          revision,
          following,
        });

        return {
          undo: [{ id, revision }, ...(following ?? [])].map((item) => ({
            id: item.id,
            revision: item.revision + 1,
          })),
        };
      }),
  );

  server.registerTool(
    "restore_transaction",
    {
      title: "Restore a deleted transaction",
      description:
        "Undoes delete_transaction with the id and revision it returned.",
      inputSchema: { id: idSchema, revision: revisionSchema },
      annotations: { ...write, destructiveHint: false, idempotentHint: false },
    },
    ({ id, revision }) =>
      run(async () => {
        const { user, householdId } = await writable();

        await store.restoreTransaction(user, householdId, { id, revision });

        const restored = await store.snapshot(user, householdId);

        return {
          restored: describeTransaction(
            restored,
            findTransaction(restored, id),
          ),
        };
      }),
  );

  server.registerTool(
    "settle_split",
    {
      title: "Mark a split expense as paid",
      description:
        "Marks your half of a split expense your partner paid as repaid, recording an income for them and an expense for you. Only the person who owes can settle.",
      inputSchema: {
        id: idSchema,
        revision: revisionSchema,
        date: dateSchema
          .optional()
          .describe("Payment date, YYYY-MM-DD. Defaults to today."),
      },
      annotations: { ...write, destructiveHint: false, idempotentHint: false },
    },
    ({ id, revision, date }) =>
      run(async () => {
        const { user, householdId } = await writable();

        await store.settleSplit(user, householdId, {
          id,
          revision,
          date: date ?? localDate(),
        });

        const settled = await store.snapshot(user, householdId);

        return {
          settled: describeTransaction(settled, findTransaction(settled, id)),
        };
      }),
  );

  server.registerTool(
    "unsettle_split",
    {
      title: "Undo a split payment",
      description:
        "Unmarks a settled split expense and removes its repayment entries.",
      inputSchema: { id: idSchema, revision: revisionSchema },
      annotations: { ...write, destructiveHint: true, idempotentHint: false },
    },
    ({ id, revision }) =>
      run(async () => {
        const { user, householdId } = await writable();

        await store.unsettleSplit(user, householdId, { id, revision });

        const unsettled = await store.snapshot(user, householdId);

        return {
          unsettled: describeTransaction(
            unsettled,
            findTransaction(unsettled, id),
          ),
        };
      }),
  );

  server.registerTool(
    "get_goal_percentages",
    {
      title: "Goal percentages",
      description:
        "Each member's split of their income across the six goals, with the revision needed to change your own.",
      annotations: readOnly,
    },
    () => run(async () => goalPercentages((await workspace()).snapshot)),
  );

  server.registerTool(
    "save_goal_percentages",
    {
      title: "Change your goal percentages",
      description:
        "Replaces your own percentages for all six goals. Values must sum to 100.",
      inputSchema: {
        percentages: goalPercentagesSchema,
        revision: revisionSchema.describe(
          "Your current revision from get_goal_percentages.",
        ),
      },
      annotations: { ...write, destructiveHint: false, idempotentHint: true },
    },
    ({ percentages, revision }) =>
      run(async () => {
        const { user, householdId } = await writable();

        await store.savePercentages(user, { percentages, revision });

        return goalPercentages(await store.snapshot(user, householdId));
      }),
  );

  return server;
}

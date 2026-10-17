import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { InStatement } from "@libsql/client";
import type {
  DeleteTransactionInput,
  RestoreTransactionInput,
  SavePercentagesInput,
  SaveTransactionInput,
  SettleSplitInput,
  UnsettleSplitInput,
} from "@/features/budget/actions/mutations";
import {
  firstOccurrence,
  clampedMonthsAfter,
} from "@/features/budget/domain/recurrence";
import {
  goalPercentagesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import {
  transactionStatus,
  type TransactionLock,
  type TransactionStatus,
} from "@/features/budget/domain/status";
import type {
  GoalPercentages,
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import { now as clockNow } from "@/lib/clock";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  all,
  bindContext,
  execute,
  memberCount,
  one,
  parseRows,
  type DatabaseTransaction,
  transactionRowSchema,
  userRowSchema,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";

const STORED_MESSAGE = "Não foi possível ler os dados salvos.";

const storedJsonSchema = z.string().transform((payload, context) => {
  try {
    return z.json().parse(JSON.parse(payload));
  } catch {
    context.addIssue({ code: "custom", message: STORED_MESSAGE });

    return z.NEVER;
  }
});

function stored<Output>(schema: z.ZodType<Output>, payload: string): Output {
  const json = storedJsonSchema.safeParse(payload);
  const result = json.success ? schema.safeParse(json.data) : undefined;

  if (!result?.success) throw new RequestError(STORED_MESSAGE, 500);

  return result.data;
}

const storedTransaction = (payload: string): Transaction =>
  stored(transactionSchema, payload);

const storedPercentages = (payload: string): GoalPercentages =>
  stored(goalPercentagesSchema, payload);

const conflict = () =>
  new RequestError(
    "Esta informação mudou no outro dispositivo. Feche e abra novamente para conferir a versão atual antes de editar.",
    409,
  );

// The action already validated the input; keep only the fields a client may
// set, so memberId, createdBy, settlementOf and the like stay server-owned.
function canonical(value: Transaction, user: UserRow): Transaction {
  return {
    id: value.id,
    description: value.description,
    amount: value.amount,
    date: value.date,
    kind: value.kind,
    goal: value.goal,
    split: value.split ? {} : undefined,
    updatedBy: user.id,
    updatedAt: clockNow().toISOString(),
  };
}

const REPAYMENT_LOCKED =
  "Este lançamento é um reembolso. Desmarque o pagamento na transação original para alterá-lo.";

const PAID_LOCKED =
  "Esta despesa dividida já foi paga. Desmarque o pagamento antes de alterar valor, tipo, divisão ou excluí-la.";

const LOCKED = {
  repayment: REPAYMENT_LOCKED,
  paid: PAID_LOCKED,
} satisfies Record<TransactionLock, string>;

function assertUnlocked(stored: Transaction, user: UserRow) {
  const { lock } = transactionStatus(stored, user.id);

  if (lock) throw new RequestError(LOCKED[lock]);
}

function touched(stored: Transaction, user: UserRow) {
  return JSON.stringify({
    ...stored,
    updatedBy: user.id,
    updatedAt: clockNow().toISOString(),
  });
}

const insertTransaction = (
  householdId: string,
  entry: Transaction,
): InStatement => ({
  sql: "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1)",
  args: [entry.id, householdId, JSON.stringify(entry)],
});

const payloadRowSchema = transactionRowSchema.pick({
  payload: true,
  revision: true,
});

const memberRowSchema = userRowSchema.pick({
  id: true,
  name: true,
  percentages: true,
  revision: true,
});

// Without a month, the whole history. With one, that month plus what its
// screens need from other months: unpaid splits (the debt card) and the later
// occurrences of the month's series (deleting "this and the following").
function transactionsQuery(householdId: string, month?: string): InStatement {
  if (!month)
    return {
      sql: "SELECT payload, revision FROM transactions WHERE household_id = ? AND deleted = 0",
      args: [householdId],
    };

  return {
    sql: `SELECT payload, revision FROM transactions
           WHERE household_id = ?1 AND deleted = 0 AND (
             json_extract(payload, '$.date') BETWEEN ?2 AND ?3
             OR (json_extract(payload, '$.split') IS NOT NULL
                 AND json_extract(payload, '$.split.paidAt') IS NULL)
             OR (json_extract(payload, '$.date') > ?3
                 AND json_extract(payload, '$.recurrenceId') IN (
                   SELECT json_extract(payload, '$.recurrenceId') FROM transactions
                    WHERE household_id = ?1 AND deleted = 0
                      AND json_extract(payload, '$.date') BETWEEN ?2 AND ?3)))`,
    args: [householdId, `${month}-01`, `${month}-31`],
  };
}

// The middleware already resolved the user and household for this request,
// so the snapshot reads only the household data, in a single round trip.
async function snapshot(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  month?: string,
): Promise<WorkspaceSnapshot> {
  await ctx.ready;

  const [transactions, members] = await ctx.db.batch(
    [
      transactionsQuery(householdId, month),
      {
        sql: "SELECT id, name, percentages, revision FROM users WHERE household_id = ? ORDER BY rowid",
        args: [householdId],
      },
    ],
    "read",
  );

  const memberBudgets = parseRows(memberRowSchema, members).map((member) => ({
    id: member.id,
    name: member.name,
    percentages: storedPercentages(member.percentages),
    percentagesRevision: member.revision,
  }));

  return {
    user: { id: user.id, name: user.name },
    household: { id: householdId, members: memberBudgets },
    budget: {
      percentages:
        memberBudgets.find((member) => member.id === user.id)?.percentages ??
        storedPercentages(user.percentages),
      transactions: parseRows(payloadRowSchema, transactions).map((row) => ({
        ...storedTransaction(row.payload),
        revision: row.revision,
      })),
    },
  };
}

// A create retried after a lost response carries no revision; accept it when
// the stored row already matches the submission.
const RETRY_FIELDS = ["description", "amount", "date", "kind", "goal"] as const;

function isRetriedCreate(stored: Transaction, t: Transaction, userId: string) {
  return (
    RETRY_FIELDS.every((field) => stored[field] === t[field]) &&
    Boolean(stored.split) === Boolean(t.split) &&
    stored.memberId === userId
  );
}

// Repayments and paid splits are locked; a new split needs both partners.
// Editing an existing split keeps its stored settlement state.
function lockedEditError(
  t: Transaction,
  previous: Transaction | undefined,
  user: UserRow,
) {
  if (!previous) return undefined;

  const { lock } = transactionStatus(previous, user.id);

  switch (lock) {
    case undefined:
      return undefined;
    case "repayment":
      return REPAYMENT_LOCKED;
    case "paid": {
      const changed =
        !t.split || t.amount !== previous.amount || t.kind !== previous.kind;

      return changed ? PAID_LOCKED : undefined;
    }

    default:
      return lock satisfies never;
  }
}

async function assertSplitEditable(
  transaction: DatabaseTransaction,
  householdId: string,
  user: UserRow,
  t: Transaction,
  previous: Transaction | undefined,
) {
  const locked = lockedEditError(t, previous, user);

  if (locked) throw new RequestError(locked);

  if (!t.split) return;

  if (previous?.split) {
    t.split = previous.split;

    return;
  }

  if ((await memberCount(transaction, householdId)) < 2)
    throw new RequestError(
      "Convide a outra pessoa do casal antes de dividir despesas.",
    );
}

function assertRevision(
  old: { deleted: number; revision: number } | undefined,
  given: number | undefined,
) {
  const stale = old
    ? old.deleted || old.revision !== given
    : given !== undefined;

  if (stale) throw conflict();
}

function assertSingleEdit(
  old: { revision: number } | undefined,
  occurrences: number,
) {
  if (old && occurrences !== 1)
    throw new RequestError("Edite cada ocorrência individualmente.");
}

function seriesInserts(
  householdId: string,
  first: Transaction,
  occurrences: number,
) {
  return Array.from({ length: occurrences - 1 }, (_, offset) => {
    const date = clampedMonthsAfter(first.date, offset + 1);

    if (!date)
      throw new RequestError(
        "A recorrência ultrapassa a data máxima permitida.",
      );

    return insertTransaction(householdId, {
      ...first,
      id: randomUUID(),
      recurrenceIndex: offset + 1,
      date,
    });
  });
}

async function saveTransaction(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  input: SaveTransactionInput,
) {
  await ctx.atomic(async (transaction) => {
    const occurrences = input.occurrences ?? 1;
    const t = canonical(input.transaction, user);

    const old = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [householdId, t.id],
    );

    const previous = old ? storedTransaction(old.payload) : undefined;
    const given = input.transaction.revision;
    const retry = old && !old.deleted && given === undefined;

    if (retry && previous && isRetriedCreate(previous, t, user.id)) return;

    assertRevision(old, given);
    assertSingleEdit(old, occurrences);

    await assertSplitEditable(transaction, householdId, user, t, previous);

    const first = firstOccurrence({
      transaction: t,
      previous,
      recurring: occurrences > 1,
      userId: user.id,
      newId: randomUUID,
    });

    await transaction.batch([
      {
        sql: "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = transactions.revision + 1",
        args: [t.id, householdId, JSON.stringify(first)],
      },
      ...seriesInserts(householdId, first, occurrences),
    ]);
  });
}

function matchesExpected(
  rows: { id: string; revision: number }[],
  expected: { id: string; revision: number }[],
) {
  return (
    expected.length === rows.length &&
    rows.every((row) =>
      expected.some(
        (item) => item.id === row.id && item.revision === row.revision,
      ),
    )
  );
}

const seriesRowSchema = transactionRowSchema
  .pick({ payload: true, revision: true })
  .extend({ id: z.string() });

// Deletes the later occurrences of a series, but only the exact set (and
// revisions) the client saw, and none that is locked.
async function deleteFollowing(
  transaction: DatabaseTransaction,
  householdId: string,
  user: UserRow,
  source: Transaction,
  expected: { id: string; revision: number }[],
) {
  const index = source.recurrenceIndex;

  if (!source.recurrenceId || index === undefined)
    throw new RequestError("Recorrência inválida.");

  const rows = await all(
    transaction,
    seriesRowSchema,
    `SELECT id, payload, revision FROM transactions
       WHERE household_id = ? AND deleted = 0
         AND json_extract(payload, '$.recurrenceId') = ?
         AND json_extract(payload, '$.recurrenceIndex') > ?`,
    [householdId, source.recurrenceId, index],
  );

  const following = rows.map((row) => ({
    ...row,
    item: storedTransaction(row.payload),
  }));

  if (!matchesExpected(following, expected)) throw conflict();

  for (const row of following) assertUnlocked(row.item, user);

  if (!following.length) return;

  await transaction.batch(
    following.map((row) => ({
      sql: "UPDATE transactions SET deleted = 1, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ?",
      args: [touched(row.item, user), householdId, row.id],
    })),
  );
}

async function deleteTransaction(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  input: DeleteTransactionInput,
) {
  await ctx.atomic(async (transaction) => {
    const previous = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [householdId, input.id],
    );

    if (!previous) throw conflict();
    const item = storedTransaction(previous.payload);

    if (!previous.deleted) assertUnlocked(item, user);

    if (input.following !== undefined)
      await deleteFollowing(
        transaction,
        householdId,
        user,
        item,
        input.following,
      );

    const result = await execute(
      transaction,
      "UPDATE transactions SET deleted = 1, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 0",
      [touched(item, user), householdId, input.id, input.revision],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

async function restoreTransaction(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  input: RestoreTransactionInput,
) {
  await ctx.atomic(async (transaction) => {
    const previous = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [householdId, input.id],
    );

    if (!previous) throw conflict();
    const item = storedTransaction(previous.payload);

    if (transactionStatus(item, user.id).repayment)
      throw new RequestError(REPAYMENT_LOCKED);

    const result = await execute(
      transaction,
      "UPDATE transactions SET deleted = 0, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 1",
      [touched(item, user), householdId, input.id, input.revision],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

type SplitSource = {
  id: string;
  revision: number;
  stored: Transaction;
  status: TransactionStatus;
};

async function splitSource(
  transaction: DatabaseTransaction,
  user: UserRow,
  householdId: string,
  input: { id: string; revision: number },
): Promise<SplitSource> {
  const row = await one(
    transaction,
    transactionRowSchema,
    "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
    [householdId, input.id],
  );

  if (!row || row.deleted || row.revision !== input.revision) throw conflict();
  const stored = storedTransaction(row.payload);
  const status = transactionStatus(stored, user.id);

  if (!status.split)
    throw new RequestError("Esta transação não está dividida.");

  if (!status.userOwes)
    throw new RequestError("Só quem deve pode marcar este pagamento.", 403);

  return { id: input.id, revision: row.revision, stored, status };
}

// Runs the split update last in the batch and fails when it hit no row.
async function batchWithSplit(
  transaction: DatabaseTransaction,
  householdId: string,
  user: UserRow,
  source: SplitSource,
  split: Transaction["split"],
  statements: InStatement[],
) {
  const results = await transaction.batch([
    ...statements,
    {
      sql: "UPDATE transactions SET payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 0",
      args: [
        touched({ ...source.stored, split }, user),
        householdId,
        source.id,
        source.revision,
      ],
    },
  ]);

  if (results.at(-1)?.rowsAffected !== 1) throw conflict();
}

async function settleSplit(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  input: SettleSplitInput,
) {
  await ctx.atomic(async (transaction) => {
    const source = await splitSource(transaction, user, householdId, input);

    if (source.status.paidAt) throw conflict();

    const now = clockNow().toISOString();
    const { stored } = source;

    const common = {
      amount: partnerShare(stored.amount),
      date: input.date,
      createdBy: user.id,
      updatedBy: user.id,
      updatedAt: now,
      settlementOf: source.id,
    };

    const income: Transaction = {
      ...common,
      id: randomUUID(),
      description: `Reembolso: ${stored.description}`.slice(0, 80),
      kind: "income",
      goal: null,
      memberId: stored.memberId,
    };

    const expense: Transaction = {
      ...common,
      id: randomUUID(),
      description: `${stored.description} (sua parte)`.slice(0, 80),
      kind: "expense",
      goal: stored.goal,
      memberId: user.id,
    };

    await batchWithSplit(
      transaction,
      householdId,
      user,
      source,
      { paidAt: now, paidBy: user.id, entryIds: [income.id, expense.id] },
      [
        insertTransaction(householdId, income),
        insertTransaction(householdId, expense),
      ],
    );
  });
}

async function unsettleSplit(
  ctx: StoreContext,
  user: UserRow,
  householdId: string,
  input: UnsettleSplitInput,
) {
  await ctx.atomic(async (transaction) => {
    const source = await splitSource(transaction, user, householdId, input);

    if (!source.status.paidAt) throw conflict();

    await batchWithSplit(
      transaction,
      householdId,
      user,
      source,
      {},
      (source.stored.split?.entryIds ?? []).map((entryId) => ({
        sql: "UPDATE transactions SET deleted = 1, revision = revision + 1 WHERE household_id = ? AND id = ? AND deleted = 0",
        args: [householdId, entryId],
      })),
    );
  });
}

async function savePercentages(
  ctx: StoreContext,
  user: UserRow,
  input: SavePercentagesInput,
) {
  await ctx.atomic(async (transaction) => {
    const result = await execute(
      transaction,
      "UPDATE users SET percentages = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
      [JSON.stringify(input.percentages), user.id, input.revision],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

export const NEW_USER_PERCENTAGES = JSON.stringify(DEFAULT_PERCENTAGES);

export function createBudgetStore(ctx: StoreContext) {
  const bind = bindContext(ctx);

  return {
    snapshot: bind(snapshot),
    saveTransaction: bind(saveTransaction),
    deleteTransaction: bind(deleteTransaction),
    restoreTransaction: bind(restoreTransaction),
    settleSplit: bind(settleSplit),
    unsettleSplit: bind(unsettleSplit),
    savePercentages: bind(savePercentages),
  };
}

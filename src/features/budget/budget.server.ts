import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ensureUser, setName } from "@/features/auth/auth.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  bankAccountSchema,
  dateSchema,
  firstIssueMessage,
  goalPercentagesSchema,
  occurrencesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { partnerShare } from "@/features/budget/domain/split";
import type {
  BankAccount,
  BudgetState,
  GoalPercentages,
  SharedSnapshot,
  Transaction,
  WorkspaceHousehold,
} from "@/features/budget/domain/types";
import {
  createHousehold as createHouseholdRecord,
  createInvite as createInviteRecord,
  household,
  householdFor,
  joinHousehold as joinHouseholdRecord,
  revokeInvite as revokeInviteRecord,
} from "@/features/household/household.server";
import {
  all,
  createStoreContext,
  execute,
  one,
  revision,
  text,
  type DatabaseExecutor,
  type DatabaseTransaction,
  accountRowSchema,
  transactionRowSchema,
  userRowSchema,
  type HouseholdRow,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";
import { databaseUrl } from "@/server/env.server";

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

const storedAccount = (payload: string): BankAccount =>
  stored(bankAccountSchema, payload);

const storedPercentages = (payload: string): GoalPercentages =>
  stored(goalPercentagesSchema, payload);

const emptyBudget = (): BudgetState => ({
  transactions: [],
  accounts: [],
  percentages: { ...DEFAULT_PERCENTAGES },
});

const conflict = () =>
  new RequestError(
    "Esta informação mudou no outro dispositivo. Feche e abra novamente para conferir a versão atual antes de editar.",
    409,
    "conflict",
  );

function canonical(value: Transaction, user: UserRow): Transaction {
  const result = transactionSchema.safeParse(value);

  if (!result.success) throw new RequestError(firstIssueMessage(result.error));
  const parsed = result.data;

  return {
    id: parsed.id,
    description: parsed.description,
    amount: parsed.amount,
    date: parsed.date,
    kind: parsed.kind,
    goal: parsed.goal,
    tags: [...new Set(parsed.tags)],
    accountId: parsed.accountId,
    split: parsed.split ? {} : undefined,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  };
}

const REPAYMENT_LOCKED =
  "Este lançamento é um reembolso. Desmarque o pagamento na transação original para alterá-lo.";

const PAID_LOCKED =
  "Esta despesa dividida já foi paga. Desmarque o pagamento antes de alterar valor, tipo, divisão ou excluí-la.";

async function memberCount(
  transaction: DatabaseTransaction,
  householdId: string,
) {
  const row = await one(
    transaction,
    z.object({ count: z.number() }),
    "SELECT count(*) AS count FROM users WHERE household_id = ?",
    [householdId],
  );

  return row?.count ?? 0;
}

function assertUnlocked(stored: Transaction) {
  if (stored.settlementOf) throw new RequestError(REPAYMENT_LOCKED);

  if (stored.split?.paidAt) throw new RequestError(PAID_LOCKED);
}

function canonicalAccount(value: BankAccount): BankAccount {
  const result = bankAccountSchema.safeParse(value);

  if (!result.success) throw new RequestError(firstIssueMessage(result.error));
  const parsed = result.data;

  return {
    id: parsed.id,
    name: parsed.name,
    openingBalance: parsed.openingBalance,
  };
}

async function memberBudgets(
  database: DatabaseExecutor,
  householdId: string,
): Promise<WorkspaceHousehold["members"]> {
  const members = await all(
    database,
    userRowSchema.pick({
      id: true,
      name: true,
      percentages: true,
      revision: true,
    }),
    `SELECT id, name, percentages, revision FROM users
       WHERE household_id = ? ORDER BY rowid`,
    [householdId],
  );

  return members.map((member) => ({
    id: member.id,
    name: member.name,
    percentages: storedPercentages(member.percentages),
    percentagesRevision: member.revision,
  }));
}

export async function householdSnapshot(
  ctx: StoreContext,
  user: UserRow,
): Promise<WorkspaceHousehold> {
  await ctx.ready;

  return ctx.readOnly(async (transaction) => {
    const fresh = await one(
      transaction,
      userRowSchema,
      "SELECT * FROM users WHERE id = ?",
      [user.id],
    );

    if (!fresh) throw new RequestError("Cadastro não encontrado.", 404);
    const owned = await household(transaction, fresh);

    return {
      id: owned.id,
      members: await memberBudgets(transaction, owned.id),
    };
  });
}

export async function snapshot(
  ctx: StoreContext,
  user: UserRow | null,
): Promise<SharedSnapshot> {
  if (!user) return { user: null, household: null, budget: emptyBudget() };

  return ctx.readOnly(async (transaction) => {
    const fresh = await one(
      transaction,
      userRowSchema,
      "SELECT * FROM users WHERE id = ?",
      [user.id],
    );

    if (!fresh) return { user: null, household: null, budget: emptyBudget() };
    const identity = { id: fresh.id, name: fresh.name };

    if (!fresh.household_id)
      return { user: identity, household: null, budget: emptyBudget() };
    const owned = await household(transaction, fresh);

    const [rows, accountRows] = await Promise.all([
      all(
        transaction,
        transactionRowSchema,
        "SELECT payload, revision, deleted FROM transactions WHERE household_id = ? AND deleted = 0",
        [owned.id],
      ),
      all(
        transaction,
        accountRowSchema.pick({ payload: true, revision: true }),
        "SELECT payload, revision FROM accounts WHERE household_id = ? AND deleted = 0",
        [owned.id],
      ),
    ]);

    return {
      user: identity,
      household: {
        id: owned.id,
        members: await memberBudgets(transaction, owned.id),
      },
      budget: {
        ...emptyBudget(),
        percentages: storedPercentages(fresh.percentages),
        transactions: rows.map((row) => ({
          ...storedTransaction(row.payload),
          revision: row.revision,
        })),
        accounts: accountRows.map((row) => ({
          ...storedAccount(row.payload),
          revision: row.revision,
        })),
      },
    };
  });
}

async function saveTransaction(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: { transaction: Transaction; occurrences?: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const occurrences = input.occurrences ?? 1;
    const parsedOccurrences = occurrencesSchema.safeParse(occurrences);

    if (!parsedOccurrences.success)
      throw new RequestError(firstIssueMessage(parsedOccurrences.error));
    const t = canonical(input.transaction, user);

    const account = await one(
      transaction,
      accountRowSchema.pick({ id: true }),
      "SELECT id FROM accounts WHERE household_id = ? AND id = ? AND deleted = 0",
      [homeRow.id, t.accountId],
    );

    if (!account) throw new RequestError("Escolha uma conta bancária.");

    const old = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [homeRow.id, t.id],
    );

    const given = input.transaction.revision;

    if (old && !old.deleted && given === undefined) {
      // A create retried after a lost response carries no revision;
      // accept it when the stored row already matches the submission.
      const stored = storedTransaction(old.payload);

      const same =
        stored.description === t.description &&
        stored.amount === t.amount &&
        stored.date === t.date &&
        stored.kind === t.kind &&
        stored.goal === t.goal &&
        stored.accountId === t.accountId &&
        Boolean(stored.split) === Boolean(t.split) &&
        stored.memberId === user.id &&
        stored.tags.length === t.tags.length &&
        stored.tags.every((tag, index) => tag === t.tags[index]);

      if (same) return;
    }

    if (old ? old.deleted || old.revision !== given : given !== undefined)
      throw conflict();

    if (old && occurrences !== 1)
      throw new RequestError("Edite cada ocorrência individualmente.");
    const previous = old ? storedTransaction(old.payload) : undefined;

    if (previous?.settlementOf) throw new RequestError(REPAYMENT_LOCKED);

    if (
      previous?.split?.paidAt &&
      (!t.split || t.amount !== previous.amount || t.kind !== previous.kind)
    )
      throw new RequestError(PAID_LOCKED);

    if (
      t.split &&
      !previous?.split &&
      (await memberCount(transaction, homeRow.id)) < 2
    )
      throw new RequestError(
        "Convide a outra pessoa do casal antes de dividir despesas.",
      );

    if (t.split && previous?.split) t.split = previous.split;
    const createdBy = previous?.createdBy ?? user.id;

    const memberId = previous?.memberId ?? previous?.createdBy ?? user.id;

    t.recurrenceId =
      previous?.recurrenceId ?? (occurrences > 1 ? randomUUID() : undefined);
    t.recurrenceIndex =
      previous?.recurrenceIndex ?? (occurrences > 1 ? 0 : undefined);
    await execute(
      transaction,
      "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = transactions.revision + 1",
      [t.id, homeRow.id, JSON.stringify({ ...t, memberId, createdBy })],
    );
    const [year, month, day] = t.date.split("-").map(Number);

    for (let index = 1; index < occurrences; index++) {
      const target = new Date(Date.UTC(year, month - 1 + index, 1));

      if (target.getUTCFullYear() > 9999)
        throw new RequestError(
          "A recorrência ultrapassa a data máxima permitida.",
        );

      const lastDay = new Date(
        Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
      ).getUTCDate();

      target.setUTCDate(Math.min(day, lastDay));

      const occurrence = {
        ...t,
        id: randomUUID(),
        recurrenceIndex: index,
        date: target.toISOString().slice(0, 10),
        memberId,
        createdBy,
      };

      await execute(
        transaction,
        "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1)",
        [occurrence.id, homeRow.id, JSON.stringify(occurrence)],
      );
    }
  });
}

async function deleteTransaction(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: {
    id: string;
    revision: number;
    following?: { id: string; revision: number }[];
  },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const id = text(input.id, 100);

    const previous = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );

    if (!previous) throw conflict();

    if (!previous.deleted) assertUnlocked(storedTransaction(previous.payload));

    if (input.following !== undefined) {
      const source = storedTransaction(previous.payload);

      if (!source.recurrenceId || source.recurrenceIndex === undefined)
        throw new RequestError("Recorrência inválida.");

      const candidates = await all(
        transaction,
        transactionRowSchema
          .pick({ payload: true, revision: true })
          .extend({ id: z.string() }),
        "SELECT id, payload, revision FROM transactions WHERE household_id = ? AND deleted = 0",
        [homeRow.id],
      );

      const following = candidates.filter((row) => {
        const item = storedTransaction(row.payload);

        return (
          item.recurrenceId === source.recurrenceId &&
          item.recurrenceIndex !== undefined &&
          item.recurrenceIndex > source.recurrenceIndex!
        );
      });

      const expected = input.following;

      if (
        expected.length !== following.length ||
        following.some(
          (row) =>
            !expected.some(
              (item) => item.id === row.id && item.revision === row.revision,
            ),
        )
      )
        throw conflict();

      for (const row of following)
        assertUnlocked(storedTransaction(row.payload));

      for (const row of following) {
        await execute(
          transaction,
          "UPDATE transactions SET deleted = 1, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ?",
          [
            JSON.stringify({
              ...storedTransaction(row.payload),
              updatedBy: user.id,
              updatedAt: new Date().toISOString(),
            }),
            homeRow.id,
            row.id,
          ],
        );
      }
    }

    const payload = JSON.stringify({
      ...storedTransaction(previous.payload),
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    });

    const result = await execute(
      transaction,
      "UPDATE transactions SET deleted = ?, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = ?",
      [1, payload, homeRow.id, id, revision(input.revision), 0],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

async function restoreTransaction(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const id = text(input.id, 100);

    const previous = await one(
      transaction,
      transactionRowSchema,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );

    if (!previous) throw conflict();

    if (storedTransaction(previous.payload).settlementOf)
      throw new RequestError(REPAYMENT_LOCKED);

    const payload = JSON.stringify({
      ...storedTransaction(previous.payload),
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    });

    const result = await execute(
      transaction,
      "UPDATE transactions SET deleted = ?, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = ?",
      [0, payload, homeRow.id, id, revision(input.revision), 1],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

async function splitSource(
  transaction: DatabaseTransaction,
  user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  const id = text(input.id, 100);

  const row = await one(
    transaction,
    transactionRowSchema,
    "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
    [homeRow.id, id],
  );

  if (!row || row.deleted || row.revision !== revision(input.revision))
    throw conflict();
  const stored = storedTransaction(row.payload);

  if (!stored.split || stored.kind !== "expense" || stored.settlementOf)
    throw new RequestError("Esta transação não está dividida.");

  if (stored.memberId === user.id)
    throw new RequestError("Só quem deve pode marcar este pagamento.", 403);

  return { id, row, stored };
}

async function writeSplit(
  transaction: DatabaseTransaction,
  homeRow: HouseholdRow,
  user: UserRow,
  source: { id: string; row: { revision: number }; stored: Transaction },
  split: Transaction["split"],
) {
  const result = await execute(
    transaction,
    "UPDATE transactions SET payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 0",
    [
      JSON.stringify({
        ...source.stored,
        split,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      }),
      homeRow.id,
      source.id,
      source.row.revision,
    ],
  );

  if (result.rowsAffected !== 1) throw conflict();
}

export async function settleSplit(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: {
    id: string;
    revision: number;
    date: string;
    payerAccountId: string;
    partnerAccountId: string;
  },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const source = await splitSource(transaction, user, homeRow, input);

    if (source.stored.split?.paidAt) throw conflict();
    const date = dateSchema.safeParse(input.date);

    if (!date.success) throw new RequestError(firstIssueMessage(date.error));

    for (const accountId of [input.payerAccountId, input.partnerAccountId]) {
      const account = await one(
        transaction,
        accountRowSchema.pick({ id: true }),
        "SELECT id FROM accounts WHERE household_id = ? AND id = ? AND deleted = 0",
        [homeRow.id, text(accountId, 100)],
      );

      if (!account) throw new RequestError("Escolha uma conta bancária.");
    }

    const now = new Date().toISOString();
    const { stored } = source;

    const common = {
      amount: partnerShare(stored.amount),
      date: date.data,
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
      tags: [],
      accountId: input.payerAccountId,
      memberId: stored.memberId,
    };

    const expense: Transaction = {
      ...common,
      id: randomUUID(),
      description: `${stored.description} (sua parte)`.slice(0, 80),
      kind: "expense",
      goal: stored.goal,
      tags: stored.tags,
      accountId: input.partnerAccountId,
      memberId: user.id,
    };

    for (const entry of [income, expense])
      await execute(
        transaction,
        "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1)",
        [entry.id, homeRow.id, JSON.stringify(entry)],
      );
    await writeSplit(transaction, homeRow, user, source, {
      paidAt: now,
      paidBy: user.id,
      entryIds: [income.id, expense.id],
    });
  });
}

export async function unsettleSplit(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const source = await splitSource(transaction, user, homeRow, input);

    if (!source.stored.split?.paidAt) throw conflict();

    for (const entryId of source.stored.split.entryIds ?? [])
      await execute(
        transaction,
        "UPDATE transactions SET deleted = 1, revision = revision + 1 WHERE household_id = ? AND id = ? AND deleted = 0",
        [homeRow.id, entryId],
      );
    await writeSplit(transaction, homeRow, user, source, {});
  });
}

async function saveAccount(
  ctx: StoreContext,
  _user: UserRow,
  homeRow: HouseholdRow,
  accountInput: BankAccount,
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const account = canonicalAccount(accountInput);

    const old = await one(
      transaction,
      accountRowSchema,
      "SELECT * FROM accounts WHERE household_id = ? AND id = ?",
      [homeRow.id, account.id],
    );

    const given = accountInput.revision;

    if (old ? old.deleted || old.revision !== given : given !== undefined)
      throw conflict();
    await execute(
      transaction,
      "INSERT INTO accounts(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = accounts.revision + 1",
      [account.id, homeRow.id, JSON.stringify(account)],
    );
  });
}

async function deleteAccount(
  ctx: StoreContext,
  _user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const id = text(input.id, 100);

    const previous = await one(
      transaction,
      accountRowSchema,
      "SELECT * FROM accounts WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );

    if (!previous || previous.deleted) throw conflict();

    const rows = await all(
      transaction,
      transactionRowSchema.pick({ payload: true }),
      "SELECT payload FROM transactions WHERE household_id = ? AND deleted = 0",
      [homeRow.id],
    );

    if (rows.some((row) => storedTransaction(row.payload).accountId === id))
      throw new RequestError(
        "Exclua ou mova as transações desta conta antes de apagá-la.",
      );

    const result = await execute(
      transaction,
      "UPDATE accounts SET deleted = 1, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 0",
      [homeRow.id, id, revision(input.revision)],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

async function savePercentages(
  ctx: StoreContext,
  user: UserRow,
  _home: HouseholdRow,
  input: { percentages: GoalPercentages; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const parsed = goalPercentagesSchema.safeParse(input.percentages);

    if (!parsed.success)
      throw new RequestError(firstIssueMessage(parsed.error));

    const result = await execute(
      transaction,
      "UPDATE users SET percentages = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
      [JSON.stringify(parsed.data), user.id, revision(input.revision)],
    );

    if (result.rowsAffected !== 1) throw conflict();
  });
}

export function createBudgetStore(filename: string) {
  const ctx = createStoreContext(filename);

  return {
    snapshot: (user: UserRow | null) => snapshot(ctx, user),
    householdSnapshot: (user: UserRow) => householdSnapshot(ctx, user),
    ensureUser: (clerkUserId: string) => ensureUser(ctx, clerkUserId),
    householdFor: (user: UserRow) => householdFor(ctx, user),
    setName: (user: UserRow, name: string) => setName(ctx, user, name),
    createHousehold: (user: UserRow) => createHouseholdRecord(ctx, user),
    joinHousehold: (user: UserRow, tokenValue: string) =>
      joinHouseholdRecord(ctx, user, tokenValue),
    createInvite: (user: UserRow, householdRow: HouseholdRow) =>
      createInviteRecord(ctx, user, householdRow),
    revokeInvite: (user: UserRow, householdRow: HouseholdRow) =>
      revokeInviteRecord(ctx, user, householdRow),
    saveTransaction: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: { transaction: Transaction; occurrences?: number },
    ) => saveTransaction(ctx, user, householdRow, input),
    deleteTransaction: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: {
        id: string;
        revision: number;
        following?: { id: string; revision: number }[];
      },
    ) => deleteTransaction(ctx, user, householdRow, input),
    restoreTransaction: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: { id: string; revision: number },
    ) => restoreTransaction(ctx, user, householdRow, input),
    settleSplit: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: {
        id: string;
        revision: number;
        date: string;
        payerAccountId: string;
        partnerAccountId: string;
      },
    ) => settleSplit(ctx, user, householdRow, input),
    unsettleSplit: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: { id: string; revision: number },
    ) => unsettleSplit(ctx, user, householdRow, input),
    saveAccount: (
      user: UserRow,
      householdRow: HouseholdRow,
      accountInput: BankAccount,
    ) => saveAccount(ctx, user, householdRow, accountInput),
    deleteAccount: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: { id: string; revision: number },
    ) => deleteAccount(ctx, user, householdRow, input),
    savePercentages: (
      user: UserRow,
      householdRow: HouseholdRow,
      input: { percentages: GoalPercentages; revision: number },
    ) => savePercentages(ctx, user, householdRow, input),
    close: () => ctx.close(),
  };
}

export type BudgetStore = ReturnType<typeof createBudgetStore>;

let store: BudgetStore | undefined;

export function getBudgetStore(): BudgetStore {
  return (store ??= createBudgetStore(databaseUrl()));
}

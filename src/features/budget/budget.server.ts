import { randomUUID } from "node:crypto";
import { ensureUser, setName } from "@/features/auth/auth.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  bankAccountSchema,
  firstIssueMessage,
  goalPercentagesSchema,
  occurrencesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type {
  BankAccount,
  BudgetState,
  GoalPercentages,
  SharedSnapshot,
  Transaction,
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
  type AccountRow,
  type HouseholdRow,
  type StoreContext,
  type TransactionRow,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";
import { databaseUrl } from "@/server/env.server";

const STORED_MESSAGE = "Não foi possível ler os dados salvos.";

function storedJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function storedTransaction(payload: string): Transaction {
  const result = transactionSchema.safeParse(storedJson(payload));
  if (!result.success) throw new RequestError(STORED_MESSAGE, 500);
  return result.data;
}

function storedAccount(payload: string): BankAccount {
  const result = bankAccountSchema.safeParse(storedJson(payload));
  if (!result.success) throw new RequestError(STORED_MESSAGE, 500);
  return result.data;
}

function storedPercentages(payload: string): GoalPercentages {
  const result = goalPercentagesSchema.safeParse(storedJson(payload));
  if (!result.success) throw new RequestError(STORED_MESSAGE, 500);
  return result.data;
}

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
  if (!result.success)
    throw new RequestError(firstIssueMessage(result.error));
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
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  };
}

function canonicalAccount(value: BankAccount): BankAccount {
  const result = bankAccountSchema.safeParse(value);
  if (!result.success)
    throw new RequestError(firstIssueMessage(result.error));
  const parsed = result.data;
  return {
    id: parsed.id,
    name: parsed.name,
    openingBalance: parsed.openingBalance,
  };
}

export async function snapshot(
  ctx: StoreContext,
  user: UserRow | null,
): Promise<SharedSnapshot> {
  if (!user) return { user: null, household: null, budget: emptyBudget() };
  return ctx.readOnly(async (transaction) => {
    const fresh = await one<UserRow>(
      transaction,
      "SELECT * FROM users WHERE id = ?",
      [user.id],
    );
    if (!fresh) return { user: null, household: null, budget: emptyBudget() };
    const identity = { id: fresh.id, name: fresh.name };
    if (!fresh.household_id)
      return { user: identity, household: null, budget: emptyBudget() };
    const owned = await household(transaction, fresh);
    const rows = await all<TransactionRow>(
      transaction,
      "SELECT payload, revision, deleted FROM transactions WHERE household_id = ? AND deleted = 0",
      [owned.id],
    );
    const accountRows = await all<AccountRow>(
      transaction,
      "SELECT payload, revision FROM accounts WHERE household_id = ? AND deleted = 0",
      [owned.id],
    );
    const members = await all<{
      id: string;
      name: string;
      percentages: string;
      revision: number;
    }>(
      transaction,
      `SELECT id, name, percentages, revision FROM users
         WHERE household_id = ? ORDER BY rowid`,
      [owned.id],
    );
    return {
      user: identity,
      household: {
        id: owned.id,
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          percentages: storedPercentages(member.percentages),
          percentagesRevision: member.revision,
        })),
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

export async function saveTransaction(
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
    const account = await one<AccountRow>(
      transaction,
      "SELECT id FROM accounts WHERE household_id = ? AND id = ? AND deleted = 0",
      [homeRow.id, t.accountId],
    );
    if (!account) throw new RequestError("Escolha uma conta bancária.");
    const old = await one<TransactionRow>(
      transaction,
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
    const createdBy = previous?.createdBy ?? user.id;
    const memberId =
      typeof previous?.memberId === "string"
        ? previous.memberId
        : typeof previous?.createdBy === "string"
          ? previous.createdBy
          : user.id;
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

export async function deleteTransaction(
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
    const previous = await one<TransactionRow>(
      transaction,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );
    if (!previous) throw conflict();
    if (input.following !== undefined) {
      const source = storedTransaction(previous.payload);
      if (!source.recurrenceId || source.recurrenceIndex === undefined)
        throw new RequestError("Recorrência inválida.");
      const candidates = await all<TransactionRow & { id: string }>(
        transaction,
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

export async function restoreTransaction(
  ctx: StoreContext,
  user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const id = text(input.id, 100);
    const previous = await one<TransactionRow>(
      transaction,
      "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );
    if (!previous) throw conflict();
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

export async function saveAccount(
  ctx: StoreContext,
  _user: UserRow,
  homeRow: HouseholdRow,
  accountInput: BankAccount,
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const account = canonicalAccount(accountInput);
    const old = await one<AccountRow>(
      transaction,
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

export async function deleteAccount(
  ctx: StoreContext,
  _user: UserRow,
  homeRow: HouseholdRow,
  input: { id: string; revision: number },
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    const id = text(input.id, 100);
    const previous = await one<AccountRow>(
      transaction,
      "SELECT * FROM accounts WHERE household_id = ? AND id = ?",
      [homeRow.id, id],
    );
    if (!previous || previous.deleted) throw conflict();
    const rows = await all<TransactionRow>(
      transaction,
      "SELECT payload FROM transactions WHERE household_id = ? AND deleted = 0",
      [homeRow.id],
    );
    if (
      rows.some((row) => storedTransaction(row.payload).accountId === id)
    )
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

export async function savePercentages(
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

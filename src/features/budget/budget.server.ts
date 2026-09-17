import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  devLogin,
  logout,
  requestLink,
  sessionUser,
  setName,
  userFromSession,
  verifyLink,
} from "@/features/auth/auth.server";
import type { MagicLinkSender } from "@/features/auth/email.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  isBankAccount,
  isGoalPercentages,
} from "@/features/budget/domain/validate";
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
  if (
    value.id.length > 100 ||
    !value.id ||
    value.description.length > 80 ||
    value.tags.length > 8 ||
    value.date < "1900-01-01" ||
    value.accountId.length > 100
  )
    throw new RequestError("Confira os dados da transação.");
  return {
    id: value.id,
    description: value.description.trim(),
    amount: value.amount,
    date: value.date,
    kind: value.kind,
    goal: value.goal,
    tags: [...new Set(value.tags)],
    accountId: value.accountId,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  };
}

function canonicalAccount(value: BankAccount): BankAccount {
  if (!isBankAccount(value) || value.id.length > 100 || value.name.length > 50)
    throw new RequestError("Confira os dados da conta.");
  return {
    id: value.id,
    name: value.name.trim(),
    openingBalance: value.openingBalance,
  };
}

export async function snapshot(
  ctx: StoreContext,
  session: string | undefined,
): Promise<SharedSnapshot> {
  return ctx.readOnly(async (transaction) => {
    const user = await userFromSession(transaction, session);
    if (!user) return { user: null, household: null, budget: emptyBudget() };
    const identity = { id: user.id, name: user.name, email: user.email };
    if (!user.household_id)
      return { user: identity, household: null, budget: emptyBudget() };
    const owned = await household(transaction, user);
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
      `SELECT users.id, users.name, member_percentages.percentages, member_percentages.revision
         FROM users JOIN member_percentages ON member_percentages.user_id = users.id
         WHERE users.household_id = ? ORDER BY users.rowid`,
      [owned.id],
    );
    const ownPercentages = await one<{ percentages: string }>(
      transaction,
      "SELECT percentages FROM member_percentages WHERE user_id = ?",
      [user.id],
    );
    return {
      user: identity,
      household: {
        id: owned.id,
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          percentages: JSON.parse(member.percentages) as GoalPercentages,
          percentagesRevision: member.revision,
        })),
      },
      budget: {
        ...emptyBudget(),
        percentages: ownPercentages
          ? (JSON.parse(ownPercentages.percentages) as GoalPercentages)
          : { ...DEFAULT_PERCENTAGES },
        transactions: rows.map((row) => ({
          ...(JSON.parse(row.payload) as Transaction),
          revision: row.revision,
        })),
        accounts: accountRows.map((row) => ({
          ...(JSON.parse(row.payload) as BankAccount),
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
    if (!Number.isInteger(occurrences) || occurrences < 1 || occurrences > 120)
      throw new RequestError("Escolha entre 1 e 120 ocorrências.");
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
      const stored = JSON.parse(old.payload) as Transaction;
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
    const previous = old ? (JSON.parse(old.payload) as Transaction) : undefined;
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
      const source = JSON.parse(previous.payload) as Transaction;
      if (!source.recurrenceId || source.recurrenceIndex === undefined)
        throw new RequestError("Recorrência inválida.");
      const candidates = await all<TransactionRow & { id: string }>(
        transaction,
        "SELECT id, payload, revision FROM transactions WHERE household_id = ? AND deleted = 0",
        [homeRow.id],
      );
      const following = candidates.filter((row) => {
        const item = JSON.parse(row.payload) as Transaction;
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
              ...(JSON.parse(row.payload) as Transaction),
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
      ...(JSON.parse(previous.payload) as Transaction),
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
      ...(JSON.parse(previous.payload) as Transaction),
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
      rows.some(
        (row) => (JSON.parse(row.payload) as Transaction).accountId === id,
      )
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
    if (!isGoalPercentages(input.percentages))
      throw new RequestError("Os percentuais devem somar 100%.");
    const result = await execute(
      transaction,
      "UPDATE member_percentages SET percentages = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?",
      [JSON.stringify(input.percentages), user.id, revision(input.revision)],
    );
    if (result.rowsAffected !== 1) throw conflict();
  });
}

export function createBudgetStore(
  filename: string,
  options: { sendMagicLink?: MagicLinkSender } = {},
) {
  const ctx = createStoreContext(filename);
  return {
    snapshot: (session: string | undefined) => snapshot(ctx, session),
    sessionUser: (session: string | undefined) => sessionUser(ctx, session),
    householdFor: (user: UserRow) => householdFor(ctx, user),
    requestLink: (input: { email: unknown; invite?: unknown }) =>
      requestLink(ctx, input, options.sendMagicLink),
    devLogin: (input: { email: unknown }, session: string | undefined) =>
      devLogin(ctx, input, session),
    verifyLink: (input: { token: unknown }, session: string | undefined) =>
      verifyLink(ctx, input, session),
    logout: (session: string | undefined) => logout(ctx, session),
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
  return (store ??= createBudgetStore(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  ));
}

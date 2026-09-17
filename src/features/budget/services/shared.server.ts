import {
  createClient,
  type Client,
  type InArgs,
  type Transaction as DatabaseTransaction,
} from "@libsql/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { sendMagicLink, type MagicLinkSender } from "@/features/budget/services/email.server";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import { isBankAccount, isGoalPercentages, isTransaction } from "@/features/budget/services/budget";
import type {
  BankAccount,
  BudgetState,
  GoalPercentages,
  SharedSnapshot,
  Transaction,
} from "@/features/budget/types";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
const emptyBudget = (): BudgetState => ({
  transactions: [],
  accounts: [],
  percentages: { ...DEFAULT_PERCENTAGES },
});
interface UserRow {
  id: string;
  name: string;
  email: string;
  household_id: string | null;
}
interface HouseholdRow {
  id: string;
  percentages: string;
  revision: number;
}
interface TransactionRow {
  payload: string;
  revision: number;
  deleted: number;
}
interface AccountRow {
  id: string;
  payload: string;
  revision: number;
  deleted: number;
}

type DatabaseExecutor = Client | DatabaseTransaction;

const schema = [
  `CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, household_id TEXT REFERENCES households(id))`,
  `CREATE TRIGGER IF NOT EXISTS two_members BEFORE UPDATE OF household_id ON users
    WHEN NEW.household_id IS NOT NULL AND (SELECT count(*) FROM users WHERE household_id = NEW.household_id AND id != NEW.id) >= 2
    BEGIN SELECT RAISE(ABORT, 'household_full'); END`,
  `CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, household_id TEXT NOT NULL UNIQUE REFERENCES households(id), expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS transactions (id TEXT NOT NULL, household_id TEXT NOT NULL REFERENCES households(id), payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))`,
  `CREATE TABLE IF NOT EXISTS accounts (id TEXT NOT NULL, household_id TEXT NOT NULL REFERENCES households(id), payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))`,
  `CREATE TABLE IF NOT EXISTS magic_links (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS member_percentages (user_id TEXT PRIMARY KEY REFERENCES users(id), percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`,
] as const;

async function execute(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return database.execute({ sql, args });
}

async function all<T extends object>(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return (await execute(database, sql, args)).rows as unknown as T[];
}

async function one<T extends object>(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return (await all<T>(database, sql, args))[0];
}

async function initializeDatabase(database: Client, local: boolean) {
  if (local) await execute(database, "PRAGMA foreign_keys = ON");
  await database.batch([...schema], "write");
  const columns = await all<{ name: string }>(
    database,
    "PRAGMA table_info(users)",
  );
  if (columns.some((column) => column.name === "password")) {
    await database.batch(
      ["ALTER TABLE users DROP COLUMN password", "DELETE FROM sessions"],
      "write",
    );
  }
  await execute(
    database,
    `INSERT OR IGNORE INTO member_percentages(user_id, percentages)
     SELECT users.id, households.percentages FROM users
     JOIN households ON households.id = users.household_id`,
  );
}

export function createBudgetStore(
  filename: string,
  options: { sendMagicLink?: MagicLinkSender } = {},
) {
  const remote = /^(?:https?|libsql|wss?):/i.test(filename);
  const local = !remote;
  const localPath =
    local && filename !== ":memory:" && !filename.startsWith("file:")
      ? filename
      : undefined;
  if (localPath && !filename.startsWith("file:"))
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const url = local
    ? filename === ":memory:"
      ? "file::memory:"
      : filename.startsWith("file:")
        ? filename
        : `file:${filename}`
    : filename;
  const db = createClient({
    url,
    authToken: local ? undefined : process.env.TURSO_AUTH_TOKEN,
    intMode: "number",
    readYourWrites: true,
    timeout: 5000,
  });
  const ready = initializeDatabase(db, local).then(() => {
    if (localPath) chmodSync(localPath, 0o600);
  });
  async function inTransaction<T>(
    mode: "read" | "write",
    fn: (transaction: DatabaseTransaction) => Promise<T>,
  ) {
    await ready;
    const transaction = await db.transaction(mode);
    try {
      const result = await fn(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        transaction.close();
      }
      throw error;
    } finally {
      transaction.close();
    }
  }
  const atomic = <T>(fn: (transaction: DatabaseTransaction) => Promise<T>) =>
    inTransaction("write", fn);
  const readOnly = <T>(fn: (transaction: DatabaseTransaction) => Promise<T>) =>
    inTransaction("read", fn);
  async function userFromSession(
    database: DatabaseExecutor,
    session: string | undefined,
  ): Promise<UserRow | null> {
    if (!session || !/^[a-f0-9]{64}$/.test(session)) return null;
    return one<UserRow>(
      database,
      `SELECT users.* FROM users JOIN sessions ON sessions.user_id = users.id WHERE sessions.hash = ? AND sessions.expires > ?`,
      [digest(session), Date.now()],
    );
  }
  async function requireUser(
    database: DatabaseExecutor,
    session: string | undefined,
  ) {
    const user = await userFromSession(database, session);
    if (!user)
      throw new RequestError("Sua sessão expirou. Entre novamente.", 401);
    return user;
  }
  async function household(database: DatabaseExecutor, user: UserRow) {
    if (!user.household_id)
      throw new RequestError("Crie um orçamento ou aceite um convite.");
    const home = await one<HouseholdRow>(
      database,
      "SELECT * FROM households WHERE id = ?",
      [user.household_id],
    );
    if (!home) throw new RequestError("Orçamento não encontrado.", 404);
    return home;
  }
  async function snapshot(
    session: string | undefined,
  ): Promise<SharedSnapshot> {
    return readOnly(async (transaction) => {
      const user = await userFromSession(transaction, session);
      if (!user) return { user: null, household: null, budget: emptyBudget() };
      const identity = { id: user.id, name: user.name, email: user.email };
      if (!user.household_id)
        return { user: identity, household: null, budget: emptyBudget() };
      const home = await household(transaction, user);
      const rows = await all<TransactionRow>(
        transaction,
        "SELECT payload, revision, deleted FROM transactions WHERE household_id = ? AND deleted = 0",
        [home.id],
      );
      const accountRows = await all<AccountRow>(
        transaction,
        "SELECT payload, revision FROM accounts WHERE household_id = ? AND deleted = 0",
        [home.id],
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
        [home.id],
      );
      const ownPercentages = await one<{ percentages: string }>(
        transaction,
        "SELECT percentages FROM member_percentages WHERE user_id = ?",
        [user.id],
      );
      return {
        user: identity,
        household: {
          id: home.id,
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
  async function throttle(key: string, limit = 10) {
    const count = await atomic(async (transaction) => {
      const now = Date.now();
      await execute(transaction, "DELETE FROM attempts WHERE expires <= ?", [
        now,
      ]);
      await execute(
        transaction,
        "INSERT INTO attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = count + 1",
        [digest(key), now + 15 * 60_000],
      );
      const row = await one<{ count: number }>(
        transaction,
        "SELECT count FROM attempts WHERE key = ?",
        [digest(key)],
      );
      return row?.count ?? 0;
    });
    if (count > limit)
      throw new RequestError(
        "Muitas tentativas. Tente novamente em 15 minutos.",
        429,
      );
  }
  function text(value: unknown, max: number) {
    if (typeof value !== "string" || !value.trim() || value.length > max)
      throw new RequestError("Confira os campos informados.");
    return value.trim();
  }
  function emailAddress(value: unknown) {
    const email = text(value, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new RequestError("Informe um e-mail válido.");
    return email;
  }
  function revision(value: unknown) {
    if (!Number.isSafeInteger(value) || Number(value) < 0)
      throw new RequestError("Versão inválida. Atualize a página.");
    return Number(value);
  }
  function canonical(value: unknown, user: UserRow): Transaction {
    if (
      !isTransaction(value) ||
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
  function canonicalAccount(value: unknown): BankAccount {
    if (
      !isBankAccount(value) ||
      value.id.length > 100 ||
      value.name.length > 50
    )
      throw new RequestError("Confira os dados da conta.");
    return {
      id: value.id,
      name: value.name.trim(),
      openingBalance: value.openingBalance,
    };
  }
  const conflict = () =>
    new RequestError(
      "Esta informação mudou no outro dispositivo. Feche e abra novamente para conferir a versão atual antes de editar.",
      409,
    );
  async function command(input: unknown, session: string | undefined) {
    await ready;
    if (!input || typeof input !== "object" || !("action" in input))
      throw new RequestError("Requisição inválida.");
    const data = input as Record<string, unknown>;
    let nextSession = session;
    let inviteToken: string | undefined;
    if (data.action === "request-link") {
      const email = emailAddress(data.email);
      await throttle(`magic:${email}`, 5);
      await throttle("magic:global", 100);
      const invite =
        data.invite === undefined ? undefined : text(data.invite, 128);
      if (invite && !/^[a-f0-9]{64}$/.test(invite))
        throw new RequestError("Convite inválido. Peça um novo link.");
      const accessToken = token();
      await atomic(async (transaction) => {
        await execute(
          transaction,
          "DELETE FROM magic_links WHERE expires <= ?",
          [Date.now()],
        );
        await execute(
          transaction,
          "INSERT INTO magic_links(hash, email, expires) VALUES (?,?,?)",
          [digest(accessToken), email, Date.now() + 15 * 60_000],
        );
      });
      try {
        await (options.sendMagicLink ?? sendMagicLink)({
          email,
          token: accessToken,
          invite,
        });
      } catch (error) {
        await execute(db, "DELETE FROM magic_links WHERE hash = ?", [
          digest(accessToken),
        ]);
        console.error(
          "Magic link delivery failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        throw new RequestError(
          "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
          503,
        );
      }
    } else if (data.action === "dev-login") {
      if (process.env.NODE_ENV !== "development")
        throw new RequestError("Atalho de desenvolvimento indisponível.", 404);
      const email = emailAddress(data.email);
      nextSession = token();
      await atomic(async (transaction) => {
        let user = await one<UserRow>(
          transaction,
          "SELECT * FROM users WHERE email = ?",
          [email],
        );
        if (!user) {
          await execute(
            transaction,
            "INSERT INTO users(id,name,email) VALUES (?,?,?)",
            [randomUUID(), "", email],
          );
          user = await one<UserRow>(
            transaction,
            "SELECT * FROM users WHERE email = ?",
            [email],
          );
        }
        if (!user) throw new RequestError("Não foi possível criar a conta.");
        await execute(
          transaction,
          "DELETE FROM sessions WHERE expires <= ? OR hash = ?",
          [Date.now(), digest(session ?? "")],
        );
        await execute(
          transaction,
          "INSERT INTO sessions(hash, user_id, expires) VALUES (?,?,?)",
          [digest(nextSession!), user.id, Date.now() + 30 * 86400_000],
        );
      });
    } else if (data.action === "verify-link") {
      const accessToken = text(data.token, 128);
      await throttle(`verify:${accessToken}`, 10);
      await throttle("verify:global", 100);
      nextSession = token();
      await atomic(async (transaction) => {
        const link = await one<{ email: string }>(
          transaction,
          "SELECT email FROM magic_links WHERE hash = ? AND expires > ?",
          [digest(accessToken), Date.now()],
        );
        if (!link)
          throw new RequestError(
            "Este link expirou ou já foi usado. Peça um novo link por e-mail.",
            410,
          );
        let user = await one<UserRow>(
          transaction,
          "SELECT * FROM users WHERE email = ?",
          [link.email],
        );
        if (!user) {
          await execute(
            transaction,
            "INSERT INTO users(id,name,email) VALUES (?,?,?)",
            [randomUUID(), "", link.email],
          );
          user = await one<UserRow>(
            transaction,
            "SELECT * FROM users WHERE email = ?",
            [link.email],
          );
        }
        await execute(transaction, "DELETE FROM magic_links WHERE email = ?", [
          link.email,
        ]);
        await execute(
          transaction,
          "DELETE FROM sessions WHERE expires <= ? OR hash = ?",
          [Date.now(), digest(session ?? "")],
        );
        await execute(
          transaction,
          "INSERT INTO sessions(hash, user_id, expires) VALUES (?,?,?)",
          [digest(nextSession!), user.id, Date.now() + 30 * 86400_000],
        );
      });
    } else if (data.action === "logout") {
      if (session)
        await execute(db, "DELETE FROM sessions WHERE hash = ?", [
          digest(session),
        ]);
      nextSession = undefined;
    } else {
      await atomic(async (transaction) => {
        const user = await requireUser(transaction, session);
        if (data.action === "profile") {
          await execute(transaction, "UPDATE users SET name = ? WHERE id = ?", [
            text(data.name, 50),
            user.id,
          ]);
          return;
        }
        if (data.action === "create" || data.action === "join") {
          if (!user.name)
            throw new RequestError(
              "Conte como você quer aparecer no orçamento.",
            );
          if (user.household_id)
            throw new RequestError(
              "Você já faz parte de um orçamento. Use a conta convidada para entrar em outro.",
              409,
            );
          if (data.action === "create") {
            const id = randomUUID();
            await execute(
              transaction,
              "INSERT INTO households(id,percentages) VALUES (?,?)",
              [id, JSON.stringify(DEFAULT_PERCENTAGES)],
            );
            await execute(
              transaction,
              "UPDATE users SET household_id = ? WHERE id = ?",
              [id, user.id],
            );
            await execute(
              transaction,
              `INSERT OR IGNORE INTO member_percentages(user_id, percentages)
               SELECT ?, percentages FROM households WHERE id = ?`,
              [user.id, id],
            );
          } else {
            const invite = await one<{ household_id: string }>(
              transaction,
              "SELECT household_id FROM invites WHERE hash = ? AND expires > ?",
              [digest(text(data.token, 128)), Date.now()],
            );
            if (!invite)
              throw new RequestError(
                "Convite inválido ou expirado. Peça um novo link.",
                410,
              );
            const count = await one<{ total: number }>(
              transaction,
              "SELECT count(*) AS total FROM users WHERE household_id = ?",
              [invite.household_id],
            );
            if ((count?.total ?? 0) >= 2)
              throw new RequestError(
                "Este orçamento já tem duas pessoas.",
                409,
              );
            await execute(
              transaction,
              "UPDATE users SET household_id = ? WHERE id = ?",
              [invite.household_id, user.id],
            );
            await execute(
              transaction,
              `INSERT OR IGNORE INTO member_percentages(user_id, percentages)
               SELECT ?, percentages FROM households WHERE id = ?`,
              [user.id, invite.household_id],
            );
            await execute(
              transaction,
              "DELETE FROM invites WHERE household_id = ?",
              [invite.household_id],
            );
          }
          return;
        }
        const home = await household(transaction, user);
        if (data.action === "invite") {
          const count = await one<{ total: number }>(
            transaction,
            "SELECT count(*) AS total FROM users WHERE household_id = ?",
            [home.id],
          );
          if ((count?.total ?? 0) >= 2)
            throw new RequestError("Seu orçamento já tem duas pessoas.", 409);
          inviteToken = token();
          await execute(
            transaction,
            "INSERT INTO invites(hash, household_id, expires) VALUES (?,?,?) ON CONFLICT(household_id) DO UPDATE SET hash = excluded.hash, expires = excluded.expires",
            [digest(inviteToken), home.id, Date.now() + 48 * 3600_000],
          );
        } else if (data.action === "revoke-invite") {
          await execute(
            transaction,
            "DELETE FROM invites WHERE household_id = ?",
            [home.id],
          );
        } else if (data.action === "save") {
          const occurrences = data.occurrences ?? 1;
          if (
            typeof occurrences !== "number" ||
            !Number.isInteger(occurrences) ||
            occurrences < 1 ||
            occurrences > 120
          )
            throw new RequestError("Escolha entre 1 e 120 ocorrências.");
          const rawTransaction = data.transaction;
          const t = canonical(rawTransaction, user);
          const account = await one<AccountRow>(
            transaction,
            "SELECT id FROM accounts WHERE household_id = ? AND id = ? AND deleted = 0",
            [home.id, t.accountId],
          );
          if (!account) throw new RequestError("Escolha uma conta bancária.");
          const old = await one<TransactionRow>(
            transaction,
            "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
            [home.id, t.id],
          );
          const given = isTransaction(rawTransaction)
            ? rawTransaction.revision
            : undefined;
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
          const previous = old
            ? (JSON.parse(old.payload) as Transaction)
            : undefined;
          const createdBy = previous?.createdBy ?? user.id;
          const memberId =
            typeof previous?.memberId === "string"
              ? previous.memberId
              : typeof previous?.createdBy === "string"
                ? previous.createdBy
                : user.id;
          t.recurrenceId =
            previous?.recurrenceId ??
            (occurrences > 1 ? randomUUID() : undefined);
          t.recurrenceIndex =
            previous?.recurrenceIndex ?? (occurrences > 1 ? 0 : undefined);
          await execute(
            transaction,
            "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = transactions.revision + 1",
            [t.id, home.id, JSON.stringify({ ...t, memberId, createdBy })],
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
              [occurrence.id, home.id, JSON.stringify(occurrence)],
            );
          }
        } else if (data.action === "delete" || data.action === "undo-delete") {
          const undo = data.action === "undo-delete";
          const id = text(data.id, 100);
          const previous = await one<TransactionRow>(
            transaction,
            "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
            [home.id, id],
          );
          if (!previous) throw conflict();
          if (!undo && data.following !== undefined) {
            const source = JSON.parse(previous.payload) as Transaction;
            if (
              !source.recurrenceId ||
              source.recurrenceIndex === undefined ||
              !Array.isArray(data.following)
            )
              throw new RequestError("Recorrência inválida.");
            const candidates = await all<TransactionRow & { id: string }>(
              transaction,
              "SELECT id, payload, revision FROM transactions WHERE household_id = ? AND deleted = 0",
              [home.id],
            );
            const following = candidates.filter((row) => {
              const item = JSON.parse(row.payload) as Transaction;
              return (
                item.recurrenceId === source.recurrenceId &&
                item.recurrenceIndex !== undefined &&
                item.recurrenceIndex > source.recurrenceIndex!
              );
            });
            const expected = data.following as {
              id: string;
              revision: number;
            }[];
            if (
              expected.length !== following.length ||
              following.some(
                (row) =>
                  !expected.some(
                    (item) =>
                      item &&
                      typeof item === "object" &&
                      "id" in item &&
                      "revision" in item &&
                      item.id === row.id &&
                      item.revision === row.revision,
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
                  home.id,
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
            [
              undo ? 0 : 1,
              payload,
              home.id,
              id,
              revision(data.revision),
              undo ? 1 : 0,
            ],
          );
          if (result.rowsAffected !== 1) throw conflict();
        } else if (data.action === "save-account") {
          const account = canonicalAccount(data.account);
          const old = await one<AccountRow>(
            transaction,
            "SELECT * FROM accounts WHERE household_id = ? AND id = ?",
            [home.id, account.id],
          );
          const given = isBankAccount(data.account)
            ? data.account.revision
            : undefined;
          if (old ? old.deleted || old.revision !== given : given !== undefined)
            throw conflict();
          await execute(
            transaction,
            "INSERT INTO accounts(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = accounts.revision + 1",
            [account.id, home.id, JSON.stringify(account)],
          );
        } else if (data.action === "delete-account") {
          const id = text(data.id, 100);
          const previous = await one<AccountRow>(
            transaction,
            "SELECT * FROM accounts WHERE household_id = ? AND id = ?",
            [home.id, id],
          );
          if (!previous || previous.deleted) throw conflict();
          const rows = await all<TransactionRow>(
            transaction,
            "SELECT payload FROM transactions WHERE household_id = ? AND deleted = 0",
            [home.id],
          );
          if (
            rows.some(
              (row) =>
                (JSON.parse(row.payload) as Transaction).accountId === id,
            )
          )
            throw new RequestError(
              "Exclua ou mova as transações desta conta antes de apagá-la.",
            );
          const result = await execute(
            transaction,
            "UPDATE accounts SET deleted = 1, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = 0",
            [home.id, id, revision(data.revision)],
          );
          if (result.rowsAffected !== 1) throw conflict();
        } else if (data.action === "percentages") {
          if (!isGoalPercentages(data.percentages))
            throw new RequestError("Os percentuais devem somar 100%.");
          const result = await execute(
            transaction,
            "UPDATE member_percentages SET percentages = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?",
            [
              JSON.stringify(data.percentages),
              user.id,
              revision(data.revision),
            ],
          );
          if (result.rowsAffected !== 1) throw conflict();
        } else throw new RequestError("Ação inválida.");
      });
    }
    return {
      session: nextSession,
      inviteToken,
    };
  }
  return { snapshot, command, close: () => db.close() };
}
export type BudgetStore = ReturnType<typeof createBudgetStore>;

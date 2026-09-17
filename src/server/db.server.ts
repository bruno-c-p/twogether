import {
  createClient,
  type Client,
  type InArgs,
  type Transaction as DatabaseTransaction,
} from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { RequestError } from "@/server/request-error";

export type { DatabaseTransaction };
export type DatabaseExecutor = Client | DatabaseTransaction;

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");

export interface UserRow {
  id: string;
  name: string;
  email: string;
  household_id: string | null;
}
export interface HouseholdRow {
  id: string;
  percentages: string;
  revision: number;
}
export interface TransactionRow {
  payload: string;
  revision: number;
  deleted: number;
}
export interface AccountRow {
  id: string;
  payload: string;
  revision: number;
  deleted: number;
}

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

export async function execute(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return database.execute({ sql, args });
}

export async function all<T extends object>(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return (await execute(database, sql, args)).rows as unknown as T[];
}

export async function one<T extends object>(
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

export function createStoreContext(filename: string) {
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
  return {
    db,
    ready,
    atomic,
    readOnly,
    close: () => db.close(),
  };
}

export type StoreContext = ReturnType<typeof createStoreContext>;

export function text(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new RequestError("Confira os campos informados.");
  return value.trim();
}

export function emailAddress(value: unknown) {
  const email = text(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new RequestError("Informe um e-mail válido.");
  return email;
}

export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new RequestError("Versão inválida. Atualize a página.");
  return Number(value);
}

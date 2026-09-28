import {
  createClient,
  type Client,
  type InArgs,
  type Transaction as DatabaseTransaction,
} from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { revisionSchema, textSchema } from "@/features/budget/domain/schemas";
import { tursoAuthToken } from "@/server/env.server";
import { RequestError } from "@/server/request-error";
import { databaseLocation } from "@/lib/database-location";

export type { DatabaseTransaction };

export type DatabaseExecutor = Client | DatabaseTransaction;

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const token = () => randomBytes(32).toString("hex");

export const userRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  household_id: z.string().nullable(),
  percentages: z.string(),
  revision: z.number(),
});

export type UserRow = z.infer<typeof userRowSchema>;

export const householdRowSchema = z.object({
  id: z.string(),
  revision: z.number(),
});

export type HouseholdRow = z.infer<typeof householdRowSchema>;

export const transactionRowSchema = z.object({
  payload: z.string(),
  revision: z.number(),
  deleted: z.number(),
});

export const accountRowSchema = z.object({
  id: z.string(),
  payload: z.string(),
  revision: z.number(),
  deleted: z.number(),
});

const schema = [
  `CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', household_id TEXT REFERENCES households(id), percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TRIGGER IF NOT EXISTS two_members BEFORE UPDATE OF household_id ON users
    WHEN NEW.household_id IS NOT NULL AND (SELECT count(*) FROM users WHERE household_id = NEW.household_id AND id != NEW.id) >= 2
    BEGIN SELECT RAISE(ABORT, 'household_full'); END`,
  `CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, household_id TEXT NOT NULL UNIQUE REFERENCES households(id), expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS transactions (id TEXT NOT NULL, household_id TEXT NOT NULL REFERENCES households(id), payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))`,
  `CREATE TABLE IF NOT EXISTS accounts (id TEXT NOT NULL, household_id TEXT NOT NULL REFERENCES households(id), payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))`,
] as const;

export async function execute(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return database.execute({ sql, args });
}

export async function all<Row extends z.ZodType>(
  database: DatabaseExecutor,
  row: Row,
  sql: string,
  args: InArgs = [],
): Promise<z.output<Row>[]> {
  const { rows } = await execute(database, sql, args);

  return z.array(row).parse(rows);
}

export async function one<Row extends z.ZodType>(
  database: DatabaseExecutor,
  row: Row,
  sql: string,
  args: InArgs = [],
): Promise<z.output<Row> | undefined> {
  return (await all(database, row, sql, args))[0];
}

const LEGACY_TABLES = [
  "transactions",
  "accounts",
  "invites",
  "member_percentages",
  "sessions",
  "magic_links",
  "attempts",
  "users",
  "households",
] as const;

const columnSchema = z.object({ name: z.string() });

async function resetLegacySchema(database: Client) {
  const users = await all(database, columnSchema, "PRAGMA table_info(users)");

  const households = await all(
    database,
    columnSchema,
    "PRAGMA table_info(households)",
  );

  const isLegacy =
    (users.length > 0 &&
      !users.some((column) => column.name === "percentages")) ||
    households.some((column) => column.name === "percentages");

  if (!isLegacy) return;
  await database.batch(
    LEGACY_TABLES.map((table) => ({
      sql: `DROP TABLE IF EXISTS ${table}`,
      args: [],
    })),
    "write",
  );
}

async function initializeDatabase(database: Client, local: boolean) {
  if (local) await execute(database, "PRAGMA foreign_keys = ON");
  await resetLegacySchema(database);
  await database.batch([...schema], "write");
}

export function createStoreContext(filename: string) {
  const { url, local, localPath } = databaseLocation(filename);

  if (localPath)
    mkdirSync(dirname(localPath), { recursive: true, mode: 0o700 });

  const db = createClient({
    url,
    authToken: local ? undefined : tursoAuthToken(),
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

export function text(value: string, max: number) {
  const result = textSchema(max).safeParse(value);

  if (!result.success) throw new RequestError("Confira os campos informados.");

  return result.data;
}

export function revision(value: number) {
  const result = revisionSchema.safeParse(value);

  if (!result.success)
    throw new RequestError("Versão inválida. Atualize a página.");

  return result.data;
}

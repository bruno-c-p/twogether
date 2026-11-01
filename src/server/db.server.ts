import {
  createClient,
  type Client,
  type InArgs,
  type ResultSet,
  type Transaction as DatabaseTransaction,
} from "@libsql/client";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { tursoAuthToken } from "@/server/env.server";
import { databaseLocation } from "@/lib/database-location";

export type { DatabaseTransaction };

export type DatabaseExecutor = Client | DatabaseTransaction;

export const userRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  household_id: z.string().nullable(),
  percentages: z.string(),
  revision: z.number(),
});

export type UserRow = z.infer<typeof userRowSchema>;

export const transactionRowSchema = z.object({
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
  // Bank accounts were removed; the revision stays because no client reads accountId.
  `DROP TABLE IF EXISTS accounts`,
  `UPDATE transactions SET payload = json_remove(payload, '$.accountId') WHERE json_extract(payload, '$.accountId') IS NOT NULL`,
  // Tags were removed; strip them from stored payloads the same way.
  `UPDATE transactions SET payload = json_remove(payload, '$.tags') WHERE json_type(payload, '$.tags') IS NOT NULL`,
  // Unsplit freedom expenses are transfers now; the revision moves so a stale tab cannot save the old kind.
  `UPDATE transactions SET payload = json_set(payload, '$.kind', 'transfer'), revision = revision + 1 WHERE json_extract(payload, '$.kind') = 'expense' AND json_extract(payload, '$.goal') = 'freedom' AND json_type(payload, '$.split') IS NULL`,
] as const;

export async function execute(
  database: DatabaseExecutor,
  sql: string,
  args: InArgs = [],
) {
  return database.execute({ sql, args });
}

export function parseRows<Row extends z.ZodType>(
  row: Row,
  result: ResultSet,
): z.output<Row>[] {
  return z.array(row).parse(result.rows);
}

export async function all<Row extends z.ZodType>(
  database: DatabaseExecutor,
  row: Row,
  sql: string,
  args: InArgs = [],
): Promise<z.output<Row>[]> {
  return parseRows(row, await execute(database, sql, args));
}

export async function one<Row extends z.ZodType>(
  database: DatabaseExecutor,
  row: Row,
  sql: string,
  args: InArgs = [],
): Promise<z.output<Row> | undefined> {
  return (await all(database, row, sql, args))[0];
}

async function initializeDatabase(database: Client, local: boolean) {
  if (local) await execute(database, "PRAGMA foreign_keys = ON");
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

    // close() rolls back a transaction that was not committed.
    try {
      const result = await fn(transaction);
      await transaction.commit();

      return result;
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

export function bindContext(ctx: StoreContext) {
  return <Args extends unknown[], Result>(
      fn: (ctx: StoreContext, ...args: Args) => Result,
    ) =>
    (...args: Args) =>
      fn(ctx, ...args);
}

export async function memberCount(
  database: DatabaseExecutor,
  householdId: string,
) {
  const row = await one(
    database,
    z.object({ total: z.number() }),
    "SELECT count(*) AS total FROM users WHERE household_id = ?",
    [householdId],
  );

  return row?.total ?? 0;
}

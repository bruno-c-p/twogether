import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { createClient } from "@libsql/client";
import { all, createStoreContext, one } from "@/server/db.server";

const countSchema = z.object({ total: z.number() });

async function householdCount(ctx: ReturnType<typeof createStoreContext>) {
  const row = await one(
    ctx.db,
    countSchema,
    "SELECT count(*) AS total FROM households",
  );

  return row?.total;
}

describe("createStoreContext", () => {
  test("drops the old bank accounts, their ids and tags from transactions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-db-"));
    const file = join(dir, "legacy.sqlite");
    const legacy = createClient({ url: `file:${file}` });

    await legacy.batch(
      [
        "CREATE TABLE accounts (id TEXT NOT NULL, household_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))",
        "CREATE TABLE transactions (id TEXT NOT NULL, household_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))",
        `INSERT INTO accounts VALUES ('nubank', 'home', '{"id":"nubank"}', 1, 0)`,
        `INSERT INTO transactions VALUES ('t1', 'home', '{"id":"t1","accountId":"nubank","tags":["casa"]}', 3, 0)`,
      ],
      "write",
    );
    legacy.close();

    const ctx = createStoreContext(file);

    try {
      await ctx.ready;

      const tables = await ctx.db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'accounts'",
      );

      const row = await one(
        ctx.db,
        z.object({ payload: z.string(), revision: z.number() }),
        "SELECT payload, revision FROM transactions WHERE id = 't1'",
      );

      expect(tables.rows).toHaveLength(0);
      expect(row).toEqual({ payload: '{"id":"t1"}', revision: 3 });
    } finally {
      ctx.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("turns unsplit freedom expenses into transfers once", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-db-"));
    const file = join(dir, "freedom.sqlite");
    const legacy = createClient({ url: `file:${file}` });

    await legacy.batch(
      [
        "CREATE TABLE transactions (id TEXT NOT NULL, household_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id))",
        `INSERT INTO transactions VALUES ('saved', 'home', '{"id":"saved","kind":"expense","goal":"freedom"}', 2, 0)`,
        `INSERT INTO transactions VALUES ('shared', 'home', '{"id":"shared","kind":"expense","goal":"freedom","split":{}}', 2, 0)`,
        `INSERT INTO transactions VALUES ('rent', 'home', '{"id":"rent","kind":"expense","goal":"fixed"}', 2, 0)`,
      ],
      "write",
    );
    legacy.close();

    const rows = async () => {
      const ctx = createStoreContext(file);

      try {
        await ctx.ready;

        return await all(
          ctx.db,
          z.object({ id: z.string(), kind: z.string(), revision: z.number() }),
          "SELECT id, json_extract(payload, '$.kind') AS kind, revision FROM transactions ORDER BY id",
        );
      } finally {
        ctx.close();
      }
    };

    try {
      const migrated = await rows();

      expect(migrated).toEqual([
        { id: "rent", kind: "expense", revision: 2 },
        { id: "saved", kind: "transfer", revision: 3 },
        { id: "shared", kind: "expense", revision: 2 },
      ]);
      expect(await rows()).toEqual(migrated);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("creates a private SQLite file and its folder for a plain path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-db-"));
    const file = join(dir, "nested", "budget.sqlite");
    const ctx = createStoreContext(file);

    try {
      await ctx.ready;
      expect(statSync(file).mode & 0o777).toBe(0o600);
      expect(await householdCount(ctx)).toBe(0);
    } finally {
      ctx.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts :memory: and file: URLs without touching the filesystem", async () => {
    const memory = createStoreContext(":memory:");
    const dir = mkdtempSync(join(tmpdir(), "twogether-db-"));
    const url = createStoreContext(`file:${join(dir, "url.sqlite")}`);

    try {
      await Promise.all([memory.ready, url.ready]);
      expect(await householdCount(memory)).toBe(0);
      expect(await householdCount(url)).toBe(0);
    } finally {
      memory.close();
      url.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("atomic commits on success and rolls back when the callback throws", async () => {
    const dir = mkdtempSync(join(tmpdir(), "twogether-db-"));
    const ctx = createStoreContext(join(dir, "tx.sqlite"));

    try {
      await ctx.atomic((transaction) =>
        transaction.execute("INSERT INTO households(id) VALUES ('kept')"),
      );

      await expect(
        ctx.atomic(async (transaction) => {
          await transaction.execute(
            "INSERT INTO households(id) VALUES ('dropped')",
          );
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");

      expect(
        await ctx.readOnly((transaction) =>
          one(
            transaction,
            countSchema,
            "SELECT count(*) AS total FROM households",
          ),
        ),
      ).toEqual({ total: 1 });
    } finally {
      ctx.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { createStoreContext, one } from "@/server/db.server";

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

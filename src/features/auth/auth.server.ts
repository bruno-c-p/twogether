import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  execute,
  one,
  type StoreContext,
  userRowSchema,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";

export async function ensureUser(
  ctx: StoreContext,
  clerkUserId: string,
): Promise<UserRow> {
  // ctx.db is used directly here, outside atomic(), so wait for the schema.
  await ctx.ready;

  const existing = await one(
    ctx.db,
    userRowSchema,
    "SELECT * FROM users WHERE id = ?",
    [clerkUserId],
  );

  if (existing) return existing;
  await ctx.atomic(async (transaction) => {
    await execute(
      transaction,
      "INSERT INTO users(id,name,percentages) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING",
      [clerkUserId, "", JSON.stringify(DEFAULT_PERCENTAGES)],
    );
  });

  const user = await one(
    ctx.db,
    userRowSchema,
    "SELECT * FROM users WHERE id = ?",
    [clerkUserId],
  );

  if (!user) throw new RequestError("Não foi possível criar a conta.");

  return user;
}

export async function setName(ctx: StoreContext, user: UserRow, name: string) {
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "UPDATE users SET name = ? WHERE id = ?", [
      name,
      user.id,
    ]);
  });
}

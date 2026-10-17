import {
  bindContext,
  execute,
  one,
  type StoreContext,
  userRowSchema,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";

async function ensureUser(
  ctx: StoreContext,
  percentages: string,
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
      [clerkUserId, "", percentages],
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

async function setName(ctx: StoreContext, user: UserRow, name: string) {
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "UPDATE users SET name = ? WHERE id = ?", [
      name,
      user.id,
    ]);
  });
}

// percentages is the JSON a new user starts with; the budget feature owns it.
export function createAuthStore(ctx: StoreContext, percentages: string) {
  const bind = bindContext(ctx);

  return {
    ensureUser: (clerkUserId: string) =>
      ensureUser(ctx, percentages, clerkUserId),
    setName: bind(setName),
  };
}

import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import {
  execute,
  one,
  text,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";

export async function ensureUser(
  ctx: StoreContext,
  clerkUserId: string,
): Promise<UserRow> {
  await ctx.ready;
  const id = text(clerkUserId, 64);

  const existing = await one<UserRow>(
    ctx.db,
    "SELECT * FROM users WHERE id = ?",
    [id],
  );

  if (existing) return existing;
  await ctx.atomic(async (transaction) => {
    await execute(
      transaction,
      "INSERT INTO users(id,name,percentages) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING",
      [id, "", JSON.stringify(DEFAULT_PERCENTAGES)],
    );
  });

  const user = await one<UserRow>(ctx.db, "SELECT * FROM users WHERE id = ?", [
    id,
  ]);

  if (!user) throw new RequestError("Não foi possível criar a conta.");

  return user;
}

export async function setName(ctx: StoreContext, user: UserRow, name: string) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "UPDATE users SET name = ? WHERE id = ?", [
      text(name, 50),
      user.id,
    ]);
  });
}

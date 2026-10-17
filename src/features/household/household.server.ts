import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  execute,
  one,
  type DatabaseExecutor,
  type DatabaseTransaction,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { z } from "zod";
import { RequestError } from "@/server/request-error";
import { now } from "@/lib/clock";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const token = () => randomBytes(32).toString("hex");

const ALREADY_MEMBER =
  "Você já faz parte de um orçamento. Use a conta convidada para entrar em outro.";

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

function requireOpenSeat(user: UserRow) {
  if (!user.name)
    throw new RequestError("Conte como você quer aparecer no orçamento.");

  if (user.household_id) throw new RequestError(ALREADY_MEMBER, 409);
}

// The user row from the request can be stale, so the seat is claimed with a
// conditional update that fails when another request already took it.
async function claimSeat(
  transaction: DatabaseTransaction,
  user: UserRow,
  householdId: string,
) {
  const result = await execute(
    transaction,
    "UPDATE users SET household_id = ? WHERE id = ? AND household_id IS NULL",
    [householdId, user.id],
  );

  if (result.rowsAffected !== 1) throw new RequestError(ALREADY_MEMBER, 409);
}

export async function createHousehold(ctx: StoreContext, user: UserRow) {
  requireOpenSeat(user);
  await ctx.atomic(async (transaction) => {
    const id = randomUUID();
    await execute(transaction, "INSERT INTO households(id) VALUES (?)", [id]);
    await claimSeat(transaction, user, id);
  });
}

export async function joinHousehold(
  ctx: StoreContext,
  user: UserRow,
  tokenValue: string,
) {
  requireOpenSeat(user);
  await ctx.atomic(async (transaction) => {
    const invite = await one(
      transaction,
      z.object({ household_id: z.string() }),
      "SELECT household_id FROM invites WHERE hash = ? AND expires > ?",
      [digest(tokenValue), now().getTime()],
    );

    if (!invite)
      throw new RequestError(
        "Convite inválido ou expirado. Peça um novo link.",
        410,
      );

    if ((await memberCount(transaction, invite.household_id)) >= 2)
      throw new RequestError("Este orçamento já tem duas pessoas.", 409);
    await claimSeat(transaction, user, invite.household_id);
    await execute(transaction, "DELETE FROM invites WHERE household_id = ?", [
      invite.household_id,
    ]);
  });
}

export async function createInvite(ctx: StoreContext, householdId: string) {
  const inviteToken = token();
  await ctx.atomic(async (transaction) => {
    if ((await memberCount(transaction, householdId)) >= 2)
      throw new RequestError("Seu orçamento já tem duas pessoas.", 409);
    await execute(
      transaction,
      "INSERT INTO invites(hash, household_id, expires) VALUES (?,?,?) ON CONFLICT(household_id) DO UPDATE SET hash = excluded.hash, expires = excluded.expires",
      [digest(inviteToken), householdId, now().getTime() + 48 * 3600_000],
    );
  });

  return { inviteToken };
}

export async function revokeInvite(ctx: StoreContext, householdId: string) {
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "DELETE FROM invites WHERE household_id = ?", [
      householdId,
    ]);
  });
}

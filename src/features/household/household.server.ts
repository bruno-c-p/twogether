import { randomUUID } from "node:crypto";
import {
  digest,
  execute,
  one,
  text,
  token,
  type DatabaseExecutor,
  type HouseholdRow,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";

export type { HouseholdRow };

export async function household(
  database: DatabaseExecutor,
  user: UserRow,
): Promise<HouseholdRow> {
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

export async function householdFor(ctx: StoreContext, user: UserRow) {
  await ctx.ready;

  if (!user.household_id) return null;

  return household(ctx.db, user);
}

function requireOpenSeat(user: UserRow) {
  if (!user.name)
    throw new RequestError("Conte como você quer aparecer no orçamento.");

  if (user.household_id)
    throw new RequestError(
      "Você já faz parte de um orçamento. Use a conta convidada para entrar em outro.",
      409,
      "full",
    );
}

export async function createHousehold(ctx: StoreContext, user: UserRow) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    requireOpenSeat(user);
    const id = randomUUID();
    await execute(transaction, "INSERT INTO households(id) VALUES (?)", [id]);
    await execute(
      transaction,
      "UPDATE users SET household_id = ? WHERE id = ?",
      [id, user.id],
    );
  });
}

export async function joinHousehold(
  ctx: StoreContext,
  user: UserRow,
  tokenValue: string,
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    requireOpenSeat(user);

    const invite = await one<{ household_id: string }>(
      transaction,
      "SELECT household_id FROM invites WHERE hash = ? AND expires > ?",
      [digest(text(tokenValue, 128)), Date.now()],
    );

    if (!invite)
      throw new RequestError(
        "Convite inválido ou expirado. Peça um novo link.",
        410,
        "expired",
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
        "full",
      );
    await execute(
      transaction,
      "UPDATE users SET household_id = ? WHERE id = ?",
      [invite.household_id, user.id],
    );
    await execute(transaction, "DELETE FROM invites WHERE household_id = ?", [
      invite.household_id,
    ]);
  });
}

export async function createInvite(
  ctx: StoreContext,
  _user: UserRow,
  home: HouseholdRow,
) {
  await ctx.ready;
  let inviteToken = "";
  await ctx.atomic(async (transaction) => {
    const count = await one<{ total: number }>(
      transaction,
      "SELECT count(*) AS total FROM users WHERE household_id = ?",
      [home.id],
    );

    if ((count?.total ?? 0) >= 2)
      throw new RequestError("Seu orçamento já tem duas pessoas.", 409, "full");
    inviteToken = token();
    await execute(
      transaction,
      "INSERT INTO invites(hash, household_id, expires) VALUES (?,?,?) ON CONFLICT(household_id) DO UPDATE SET hash = excluded.hash, expires = excluded.expires",
      [digest(inviteToken), home.id, Date.now() + 48 * 3600_000],
    );
  });

  return { inviteToken };
}

export async function revokeInvite(
  ctx: StoreContext,
  _user: UserRow,
  home: HouseholdRow,
) {
  await ctx.ready;
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "DELETE FROM invites WHERE household_id = ?", [
      home.id,
    ]);
  });
}

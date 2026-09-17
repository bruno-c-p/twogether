import { randomUUID } from "node:crypto";
import {
  digest,
  emailAddress,
  execute,
  one,
  text,
  token,
  type DatabaseExecutor,
  type DatabaseTransaction,
  type StoreContext,
  type UserRow,
} from "@/server/db.server";
import { RequestError } from "@/server/request-error";
import {
  sendMagicLink,
  type MagicLinkSender,
} from "@/features/auth/email.server";

export async function userFromSession(
  database: DatabaseExecutor,
  session: string | undefined,
): Promise<UserRow | null> {
  if (!session || !/^[a-f0-9]{64}$/.test(session)) return null;
  return one<UserRow>(
    database,
    `SELECT users.* FROM users JOIN sessions ON sessions.user_id = users.id WHERE sessions.hash = ? AND sessions.expires > ?`,
    [digest(session), Date.now()],
  );
}

export async function sessionUser(
  ctx: StoreContext,
  session: string | undefined,
) {
  await ctx.ready;
  return userFromSession(ctx.db, session);
}

async function throttle(ctx: StoreContext, key: string, limit = 10) {
  const count = await ctx.atomic(async (transaction) => {
    const now = Date.now();
    await execute(transaction, "DELETE FROM attempts WHERE expires <= ?", [
      now,
    ]);
    await execute(
      transaction,
      "INSERT INTO attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = count + 1",
      [digest(key), now + 15 * 60_000],
    );
    const row = await one<{ count: number }>(
      transaction,
      "SELECT count FROM attempts WHERE key = ?",
      [digest(key)],
    );
    return row?.count ?? 0;
  });
  if (count > limit)
    throw new RequestError(
      "Muitas tentativas. Tente novamente em 15 minutos.",
      429,
    );
}

async function openSession(
  ctx: StoreContext,
  session: string | undefined,
  lookup: (transaction: DatabaseTransaction) => Promise<UserRow>,
) {
  const nextSession = token();
  await ctx.atomic(async (transaction) => {
    const user = await lookup(transaction);
    await execute(
      transaction,
      "DELETE FROM sessions WHERE expires <= ? OR hash = ?",
      [Date.now(), digest(session ?? "")],
    );
    await execute(
      transaction,
      "INSERT INTO sessions(hash, user_id, expires) VALUES (?,?,?)",
      [digest(nextSession), user.id, Date.now() + 30 * 86400_000],
    );
  });
  return { session: nextSession };
}

async function userByEmail(
  transaction: DatabaseTransaction,
  email: string,
  missing: string,
) {
  let user = await one<UserRow>(
    transaction,
    "SELECT * FROM users WHERE email = ?",
    [email],
  );
  if (!user) {
    await execute(
      transaction,
      "INSERT INTO users(id,name,email) VALUES (?,?,?)",
      [randomUUID(), "", email],
    );
    user = await one<UserRow>(
      transaction,
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
  }
  if (!user) throw new RequestError(missing);
  return user;
}

export async function requestLink(
  ctx: StoreContext,
  input: { email: unknown; invite?: unknown },
  sender?: MagicLinkSender,
) {
  await ctx.ready;
  const email = emailAddress(input.email);
  await throttle(ctx, `magic:${email}`, 5);
  await throttle(ctx, "magic:global", 100);
  const invite =
    input.invite === undefined ? undefined : text(input.invite, 128);
  if (invite && !/^[a-f0-9]{64}$/.test(invite))
    throw new RequestError("Convite inválido. Peça um novo link.");
  const accessToken = token();
  await ctx.atomic(async (transaction) => {
    await execute(transaction, "DELETE FROM magic_links WHERE expires <= ?", [
      Date.now(),
    ]);
    await execute(
      transaction,
      "INSERT INTO magic_links(hash, email, expires) VALUES (?,?,?)",
      [digest(accessToken), email, Date.now() + 15 * 60_000],
    );
  });
  try {
    await (sender ?? sendMagicLink)({
      email,
      token: accessToken,
      invite,
    });
  } catch (error) {
    await execute(ctx.db, "DELETE FROM magic_links WHERE hash = ?", [
      digest(accessToken),
    ]);
    console.error(
      "Magic link delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    throw new RequestError(
      "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
      503,
    );
  }
  return { session: undefined as string | undefined };
}

export async function devLogin(
  ctx: StoreContext,
  input: { email: unknown },
  session: string | undefined,
) {
  await ctx.ready;
  if (process.env.NODE_ENV !== "development")
    throw new RequestError("Atalho de desenvolvimento indisponível.", 404);
  const email = emailAddress(input.email);
  return openSession(ctx, session, (transaction) =>
    userByEmail(transaction, email, "Não foi possível criar a conta."),
  );
}

export async function verifyLink(
  ctx: StoreContext,
  input: { token: unknown },
  session: string | undefined,
) {
  await ctx.ready;
  const accessToken = text(input.token, 128);
  await throttle(ctx, `verify:${accessToken}`, 10);
  await throttle(ctx, "verify:global", 100);
  return openSession(ctx, session, async (transaction) => {
    const link = await one<{ email: string }>(
      transaction,
      "SELECT email FROM magic_links WHERE hash = ? AND expires > ?",
      [digest(accessToken), Date.now()],
    );
    if (!link)
      throw new RequestError(
        "Este link expirou ou já foi usado. Peça um novo link por e-mail.",
        410,
      );
    const user = await userByEmail(
      transaction,
      link.email,
      "Não foi possível criar a conta.",
    );
    await execute(transaction, "DELETE FROM magic_links WHERE email = ?", [
      link.email,
    ]);
    return user;
  });
}

export async function logout(ctx: StoreContext, session: string | undefined) {
  await ctx.ready;
  if (session)
    await execute(ctx.db, "DELETE FROM sessions WHERE hash = ?", [
      digest(session),
    ]);
  return { session: undefined as string | undefined };
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

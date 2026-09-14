import { Database } from "bun:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { sendMagicLink, type MagicLinkSender } from "./email.server";
import { DEFAULT_PERCENTAGES } from "../constants";
import { isGoalPercentages, isTransaction } from "./budget";
import type { BudgetState, SharedSnapshot, Transaction } from "../types";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
const emptyBudget = (): BudgetState => ({
  transactions: [],
  percentages: { ...DEFAULT_PERCENTAGES },
});
interface UserRow {
  id: string;
  name: string;
  email: string;
  household_id: string | null;
}
interface HouseholdRow {
  id: string;
  percentages: string;
  revision: number;
}
interface TransactionRow {
  payload: string;
  revision: number;
  deleted: number;
}

export function createBudgetStore(
  filename: string,
  options: { sendMagicLink?: MagicLinkSender } = {},
) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new Database(filename, { create: true, strict: true });
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, percentages TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, household_id TEXT REFERENCES households(id));
    CREATE TRIGGER IF NOT EXISTS two_members BEFORE UPDATE OF household_id ON users
      WHEN NEW.household_id IS NOT NULL AND (SELECT count(*) FROM users WHERE household_id = NEW.household_id AND id != NEW.id) >= 2
      BEGIN SELECT RAISE(ABORT, 'household_full'); END;
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, household_id TEXT NOT NULL UNIQUE REFERENCES households(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS transactions (id TEXT NOT NULL, household_id TEXT NOT NULL REFERENCES households(id), payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(household_id, id));
    CREATE TABLE IF NOT EXISTS magic_links (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
  `);
  if (
    db
      .query<{ name: string }, []>("PRAGMA table_info(users)")
      .all()
      .some((column) => column.name === "password")
  )
    db.transaction(() => {
      db.exec("ALTER TABLE users DROP COLUMN password");
      db.exec("DELETE FROM sessions");
    }).immediate();
  const atomic = <T>(fn: () => T) => db.transaction(fn).immediate();
  function userFromSession(session: string | undefined): UserRow | null {
    if (!session || !/^[a-f0-9]{64}$/.test(session)) return null;
    return db
      .query<UserRow, [string, number]>(
        `SELECT users.* FROM users JOIN sessions ON sessions.user_id = users.id WHERE sessions.hash = ? AND sessions.expires > ?`,
      )
      .get(digest(session), Date.now());
  }
  function requireUser(session: string | undefined) {
    const user = userFromSession(session);
    if (!user)
      throw new RequestError("Sua sessão expirou. Entre novamente.", 401);
    return user;
  }
  function household(user: UserRow) {
    if (!user.household_id)
      throw new RequestError("Crie um orçamento ou aceite um convite.");
    const home = db
      .query<HouseholdRow, [string]>("SELECT * FROM households WHERE id = ?")
      .get(user.household_id);
    if (!home) throw new RequestError("Orçamento não encontrado.", 404);
    return home;
  }
  function snapshot(session: string | undefined): SharedSnapshot {
    return atomic(() => {
      const user = userFromSession(session);
      if (!user) return { user: null, household: null, budget: emptyBudget() };
      const identity = { id: user.id, name: user.name, email: user.email };
      if (!user.household_id)
        return { user: identity, household: null, budget: emptyBudget() };
      const home = household(user);
      const rows = db
        .query<TransactionRow, [string]>(
          "SELECT payload, revision, deleted FROM transactions WHERE household_id = ? AND deleted = 0",
        )
        .all(home.id);
      return {
        user: identity,
        household: {
          id: home.id,
          members: db
            .query<{ id: string; name: string }, [string]>(
              "SELECT id, name FROM users WHERE household_id = ? ORDER BY rowid",
            )
            .all(home.id),
          percentagesRevision: home.revision,
        },
        budget: {
          ...emptyBudget(),
          percentages: JSON.parse(home.percentages),
          transactions: rows.map((row) => ({
            ...JSON.parse(row.payload),
            revision: row.revision,
          })),
        },
      };
    });
  }
  function throttle(key: string, limit = 10) {
    atomic(() => {
      const now = Date.now();
      db.query("DELETE FROM attempts WHERE expires <= ?").run(now);
      db.query(
        "INSERT INTO attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = count + 1",
      ).run(digest(key), now + 15 * 60_000);
    });
    const row = db
      .query<{ count: number }, [string]>(
        "SELECT count FROM attempts WHERE key = ?",
      )
      .get(digest(key));
    if (row && row.count > limit)
      throw new RequestError(
        "Muitas tentativas. Tente novamente em 15 minutos.",
        429,
      );
  }
  function text(value: unknown, max: number) {
    if (typeof value !== "string" || !value.trim() || value.length > max)
      throw new RequestError("Confira os campos informados.");
    return value.trim();
  }
  function emailAddress(value: unknown) {
    const email = text(value, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new RequestError("Informe um e-mail válido.");
    return email;
  }
  function revision(value: unknown) {
    if (!Number.isSafeInteger(value) || Number(value) < 0)
      throw new RequestError("Versão inválida. Atualize a página.");
    return Number(value);
  }
  function canonical(
    value: unknown,
    user: UserRow,
    home: HouseholdRow,
  ): Transaction {
    if (
      !isTransaction(value) ||
      value.id.length > 100 ||
      !value.id ||
      value.description.length > 80 ||
      value.tags.length > 8 ||
      value.date < "1900-01-01"
    )
      throw new RequestError("Confira os dados da transação.");
    if (
      typeof value.memberId !== "string" ||
      !db
        .query("SELECT 1 FROM users WHERE id = ? AND household_id = ?")
        .get(value.memberId, home.id)
    )
      throw new RequestError("Selecione uma pessoa deste casal.");
    return {
      id: value.id,
      description: value.description.trim(),
      amount: value.amount,
      date: value.date,
      kind: value.kind,
      goal: value.goal,
      tags: [...new Set(value.tags)],
      memberId: value.memberId,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };
  }
  const conflict = () =>
    new RequestError(
      "Esta informação mudou no outro dispositivo. Feche e abra novamente para conferir a versão atual antes de editar.",
      409,
    );
  async function command(input: unknown, session: string | undefined) {
    if (!input || typeof input !== "object" || !("action" in input))
      throw new RequestError("Requisição inválida.");
    const data = input as Record<string, unknown>;
    let nextSession = session;
    let inviteToken: string | undefined;
    if (data.action === "request-link") {
      const email = emailAddress(data.email);
      throttle(`magic:${email}`, 5);
      throttle("magic:global", 100);
      const invite =
        data.invite === undefined ? undefined : text(data.invite, 128);
      if (invite && !/^[a-f0-9]{64}$/.test(invite))
        throw new RequestError("Convite inválido. Peça um novo link.");
      const accessToken = token();
      atomic(() => {
        db.query("DELETE FROM magic_links WHERE expires <= ?").run(Date.now());
        db.query("INSERT INTO magic_links VALUES (?,?,?)").run(
          digest(accessToken),
          email,
          Date.now() + 15 * 60_000,
        );
      });
      try {
        await (options.sendMagicLink ?? sendMagicLink)({
          email,
          token: accessToken,
          invite,
        });
      } catch (error) {
        db.query("DELETE FROM magic_links WHERE hash = ?").run(
          digest(accessToken),
        );
        console.error(
          "Magic link delivery failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        throw new RequestError(
          "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
          503,
        );
      }
    } else if (data.action === "dev-login") {
      if (process.env.NODE_ENV !== "development")
        throw new RequestError("Atalho de desenvolvimento indisponível.", 404);
      const email = emailAddress(data.email);
      nextSession = token();
      atomic(() => {
        let user = db
          .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
          .get(email);
        if (!user) {
          db.query("INSERT INTO users(id,name,email) VALUES (?,?,?)").run(
            randomUUID(),
            "",
            email,
          );
          user = db
            .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
            .get(email);
        }
        if (!user) throw new RequestError("Não foi possível criar a conta.");
        db.query("DELETE FROM sessions WHERE expires <= ? OR hash = ?").run(
          Date.now(),
          digest(session ?? ""),
        );
        db.query("INSERT INTO sessions VALUES (?,?,?)").run(
          digest(nextSession!),
          user.id,
          Date.now() + 30 * 86400_000,
        );
      });
    } else if (data.action === "verify-link") {
      const accessToken = text(data.token, 128);
      nextSession = token();
      atomic(() => {
        const link = db
          .query<{ email: string }, [string, number]>(
            "SELECT email FROM magic_links WHERE hash = ? AND expires > ?",
          )
          .get(digest(accessToken), Date.now());
        if (!link)
          throw new RequestError(
            "Este link expirou ou já foi usado. Peça um novo link por e-mail.",
            410,
          );
        let user = db
          .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
          .get(link.email);
        if (!user) {
          db.query("INSERT INTO users(id,name,email) VALUES (?,?,?)").run(
            randomUUID(),
            "",
            link.email,
          );
          user = db
            .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
            .get(link.email)!;
        }
        db.query("DELETE FROM magic_links WHERE email = ?").run(link.email);
        db.query("DELETE FROM sessions WHERE expires <= ? OR hash = ?").run(
          Date.now(),
          digest(session ?? ""),
        );
        db.query("INSERT INTO sessions VALUES (?,?,?)").run(
          digest(nextSession!),
          user.id,
          Date.now() + 30 * 86400_000,
        );
      });
    } else if (data.action === "logout") {
      if (session)
        db.query("DELETE FROM sessions WHERE hash = ?").run(digest(session));
      nextSession = undefined;
    } else {
      atomic(() => {
        const user = requireUser(session);
        if (data.action === "profile") {
          db.query("UPDATE users SET name = ? WHERE id = ?").run(
            text(data.name, 50),
            user.id,
          );
          return;
        }
        if (data.action === "create" || data.action === "join") {
          if (!user.name)
            throw new RequestError(
              "Conte como você quer aparecer no orçamento.",
            );
          if (user.household_id)
            throw new RequestError(
              "Você já faz parte de um orçamento. Use a conta convidada para entrar em outro.",
              409,
            );
          if (data.action === "create") {
            const id = randomUUID();
            db.query("INSERT INTO households(id,percentages) VALUES (?,?)").run(
              id,
              JSON.stringify(DEFAULT_PERCENTAGES),
            );
            db.query("UPDATE users SET household_id = ? WHERE id = ?").run(
              id,
              user.id,
            );
          } else {
            const invite = db
              .query<{ household_id: string }, [string, number]>(
                "SELECT household_id FROM invites WHERE hash = ? AND expires > ?",
              )
              .get(digest(text(data.token, 128)), Date.now());
            if (!invite)
              throw new RequestError(
                "Convite inválido ou expirado. Peça um novo link.",
                410,
              );
            const count = db
              .query<{ total: number }, [string]>(
                "SELECT count(*) AS total FROM users WHERE household_id = ?",
              )
              .get(invite.household_id)!.total;
            if (count >= 2)
              throw new RequestError(
                "Este orçamento já tem duas pessoas.",
                409,
              );
            db.query("UPDATE users SET household_id = ? WHERE id = ?").run(
              invite.household_id,
              user.id,
            );
            db.query("DELETE FROM invites WHERE household_id = ?").run(
              invite.household_id,
            );
          }
          return;
        }
        const home = household(user);
        if (data.action === "invite") {
          if (
            db
              .query<{ total: number }, [string]>(
                "SELECT count(*) AS total FROM users WHERE household_id = ?",
              )
              .get(home.id)!.total >= 2
          )
            throw new RequestError("Seu orçamento já tem duas pessoas.", 409);
          inviteToken = token();
          db.query(
            "INSERT INTO invites VALUES (?,?,?) ON CONFLICT(household_id) DO UPDATE SET hash = excluded.hash, expires = excluded.expires",
          ).run(digest(inviteToken), home.id, Date.now() + 48 * 3600_000);
        } else if (data.action === "revoke-invite") {
          db.query("DELETE FROM invites WHERE household_id = ?").run(home.id);
        } else if (data.action === "save") {
          const t = canonical(data.transaction, user, home);
          const old = db
            .query<TransactionRow, [string, string]>(
              "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
            )
            .get(home.id, t.id);
          const given = (data.transaction as Transaction).revision;
          if (old ? old.deleted || old.revision !== given : given !== undefined)
            throw conflict();
          const createdBy = old
            ? (JSON.parse(old.payload) as Transaction).createdBy
            : user.id;
          db.query(
            "INSERT INTO transactions(id,household_id,payload,revision) VALUES (?,?,?,1) ON CONFLICT(household_id,id) DO UPDATE SET payload = excluded.payload, revision = transactions.revision + 1",
          ).run(t.id, home.id, JSON.stringify({ ...t, createdBy }));
        } else if (data.action === "delete" || data.action === "undo-delete") {
          const undo = data.action === "undo-delete";
          const id = text(data.id, 100);
          const previous = db
            .query<TransactionRow, [string, string]>(
              "SELECT * FROM transactions WHERE household_id = ? AND id = ?",
            )
            .get(home.id, id);
          if (!previous) throw conflict();
          const payload = JSON.stringify({
            ...JSON.parse(previous.payload),
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
          });
          const result = db
            .query(
              "UPDATE transactions SET deleted = ?, payload = ?, revision = revision + 1 WHERE household_id = ? AND id = ? AND revision = ? AND deleted = ?",
            )
            .run(
              undo ? 0 : 1,
              payload,
              home.id,
              id,
              revision(data.revision),
              undo ? 1 : 0,
            );
          if (!result.changes) throw conflict();
        } else if (data.action === "percentages") {
          if (!isGoalPercentages(data.percentages))
            throw new RequestError("Os percentuais devem somar 100%.");
          const result = db
            .query(
              "UPDATE households SET percentages = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
            )
            .run(
              JSON.stringify(data.percentages),
              home.id,
              revision(data.revision),
            );
          if (!result.changes) throw conflict();
        } else throw new RequestError("Ação inválida.");
      });
    }
    return {
      snapshot: snapshot(nextSession),
      session: nextSession,
      inviteToken,
    };
  }
  return { snapshot, command, close: () => db.close() };
}
export type BudgetStore = ReturnType<typeof createBudgetStore>;

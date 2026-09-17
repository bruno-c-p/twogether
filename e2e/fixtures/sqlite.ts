import { createClient } from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

function databasePath() {
  return process.env.BUDGET_DATABASE_PATH ?? "/tmp/twogether-e2e.sqlite";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("hex");
}

export async function seedMagicLink(
  email: string,
  expiresAt = Date.now() + 15 * 60_000,
) {
  const path = databasePath();
  if (!existsSync(path)) {
    throw new Error(`e2e sqlite is missing at ${path}`);
  }
  const token = randomToken();
  const db = createClient({ url: `file:${path}` });
  try {
    await db.execute({
      sql: "INSERT INTO magic_links(hash, email, expires) VALUES (?,?,?)",
      args: [digest(token), email.toLowerCase(), expiresAt],
    });
  } finally {
    db.close();
  }
  return token;
}

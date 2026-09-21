import { createClient } from "@libsql/client";
import { databaseUrl } from "@/server/env";

const legacyTables = [
  "transactions",
  "accounts",
  "invites",
  "member_percentages",
  "sessions",
  "magic_links",
  "attempts",
  "users",
  "households",
] as const;

if (!process.argv.includes("--yes")) {
  console.error(
    "This drops every table of the legacy magic-link schema. Run with --yes to confirm.",
  );
  process.exit(1);
}

const url = databaseUrl();
const remote = /^(?:https?|libsql|wss?):/i.test(url);
const target = remote
  ? new URL(url).host
  : url === ":memory:"
    ? ":memory:"
    : url.replace(/^file:/, "");
console.log(`Resetting ${target}`);
const db = createClient({
  url: remote
    ? url
    : url === ":memory:"
      ? "file::memory:"
      : url.startsWith("file:")
        ? url
        : `file:${url}`,
  authToken: remote ? process.env.TURSO_AUTH_TOKEN : undefined,
  intMode: "number",
});
try {
  const result = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  const names = new Set(
    (result.rows as unknown as { name: string }[]).map((row) => row.name),
  );
  const dropped = legacyTables.filter((table) => names.has(table));
  if (dropped.length)
    await db.batch(
      dropped.map((table) => ({
        sql: `DROP TABLE IF EXISTS ${table}`,
        args: [],
      })),
      "write",
    );
  console.log(
    dropped.length ? `Dropped: ${dropped.join(", ")}` : "Nothing to drop.",
  );
  console.log("The app recreates the new schema on next boot.");
} finally {
  db.close();
}

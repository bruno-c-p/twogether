import { resolve } from "node:path";
import { z } from "zod";
import { firstIssueMessage } from "@/features/budget/domain/schemas";

const DATABASE_MESSAGE = "O caminho do banco de dados é inválido.";
const CLERK_MESSAGE = "A variável de ambiente CLERK_SECRET_KEY é obrigatória.";
const TOKEN_MESSAGE =
  "A variável de ambiente TURSO_AUTH_TOKEN é obrigatória quando o banco remoto está configurado.";

const remoteDatabase = /^(?:https?|libsql|wss?):/i;

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

const databaseUrlSchema = z
  .string({ error: DATABASE_MESSAGE })
  .min(1, { error: DATABASE_MESSAGE })
  .refine(
    (value) => {
      if (value === ":memory:" || value.startsWith("file:")) return true;
      if (!remoteDatabase.test(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { error: DATABASE_MESSAGE },
  );

const optionalDatabaseUrl = z.preprocess(
  emptyAsUndefined,
  databaseUrlSchema.optional(),
);

const optionalToken = z.preprocess(
  emptyAsUndefined,
  z
    .string({ error: TOKEN_MESSAGE })
    .min(1, { error: TOKEN_MESSAGE })
    .optional(),
);

export const serverEnvSchema = z
  .object({
    CLERK_SECRET_KEY: z.preprocess(
      emptyAsUndefined,
      z.string({ error: CLERK_MESSAGE }).min(1, { error: CLERK_MESSAGE }),
    ),
    TURSO_DATABASE_URL: optionalDatabaseUrl,
    TURSO_AUTH_TOKEN: optionalToken,
    BUDGET_DATABASE_PATH: optionalDatabaseUrl,
  })
  .refine(
    (env) => {
      const url = env.TURSO_DATABASE_URL ?? env.BUDGET_DATABASE_PATH;
      return !url || !remoteDatabase.test(url) || Boolean(env.TURSO_AUTH_TOKEN);
    },
    { error: TOKEN_MESSAGE, path: ["TURSO_AUTH_TOKEN"] },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(values: Record<string, string | undefined>) {
  const result = serverEnvSchema.safeParse(values);
  if (!result.success) throw new Error(firstIssueMessage(result.error));
  return result.data;
}

let cached: ServerEnv | undefined;

export function serverEnv() {
  return (cached ??= parseServerEnv(process.env));
}

export function databaseUrl() {
  const env = serverEnv();
  return (
    env.TURSO_DATABASE_URL ??
    env.BUDGET_DATABASE_PATH ??
    resolve("data/twogether.sqlite")
  );
}

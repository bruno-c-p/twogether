import { resolve } from "node:path";
import { createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { firstIssueMessage } from "@/features/budget/domain/schemas";

const DATABASE_MESSAGE = "O caminho do banco de dados é inválido.";

const databaseUrlSchema = z
  .string({ error: DATABASE_MESSAGE })
  .min(1, { error: DATABASE_MESSAGE })
  .refine(
    (value) => {
      if (value === ":memory:" || value.startsWith("file:")) return true;
      if (!/^(?:https?|libsql|wss?):/i.test(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { error: DATABASE_MESSAGE },
  );

export const databaseUrl = createServerOnlyFn(() => {
  const result = databaseUrlSchema.safeParse(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  );
  if (!result.success) throw new Error(firstIssueMessage(result.error));
  return result.data;
});

export const tursoAuthToken = createServerOnlyFn(
  () => process.env.TURSO_AUTH_TOKEN,
);

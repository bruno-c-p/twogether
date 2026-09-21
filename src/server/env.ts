import { resolve } from "node:path";
import { z } from "zod";
import { firstIssueMessage } from "@/features/budget/domain/schemas";

const CONFIG_MESSAGE = "O envio de e-mail ainda não está configurado no servidor.";
const ORIGIN_MESSAGE = "APP_ORIGIN deve conter apenas a origem pública da aplicação.";
const DATABASE_MESSAGE = "O caminho do banco de dados é inválido.";

const nodeEnvSchema = z
  .enum(["development", "production", "test"], {
    error: "NODE_ENV inválido.",
  })
  .catch("production");

export function nodeEnv() {
  return nodeEnvSchema.parse(process.env.NODE_ENV);
}

const appOriginSchema = z
  .string({ error: CONFIG_MESSAGE })
  .min(1, { error: CONFIG_MESSAGE })
  .refine(
    (value) => {
      try {
        const origin = new URL(value);
        return (
          origin.pathname === "/" &&
          !origin.search &&
          !origin.hash &&
          (origin.protocol === "https:" || origin.protocol === "http:")
        );
      } catch {
        return false;
      }
    },
    { error: ORIGIN_MESSAGE },
  );

const emailEnvSchema = z
  .object({
    RESEND_API_KEY: z
      .string({ error: CONFIG_MESSAGE })
      .min(1, { error: CONFIG_MESSAGE }),
    RESEND_FROM: z
      .string({ error: CONFIG_MESSAGE })
      .min(1, { error: CONFIG_MESSAGE }),
    APP_ORIGIN: appOriginSchema,
  })
  .superRefine((env, ctx) => {
    if (
      nodeEnv() === "production" &&
      new URL(env.APP_ORIGIN).protocol !== "https:"
    )
      ctx.addIssue({
        code: "custom",
        message: "APP_ORIGIN precisa usar HTTPS em produção.",
      });
  });

export function emailConfig() {
  const result = emailEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    APP_ORIGIN: process.env.APP_ORIGIN,
  });
  if (!result.success) throw new Error(firstIssueMessage(result.error));
  return result.data;
}

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

export function databaseUrl() {
  const result = databaseUrlSchema.safeParse(
    process.env.TURSO_DATABASE_URL ||
      process.env.BUDGET_DATABASE_PATH ||
      resolve("data/twogether.sqlite"),
  );
  if (!result.success) throw new Error(firstIssueMessage(result.error));
  return result.data;
}

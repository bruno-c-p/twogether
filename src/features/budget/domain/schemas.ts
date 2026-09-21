import { z } from "zod";
import { GOALS } from "@/features/budget/constants";
import { parseAmount, parseBalance } from "@/features/budget/domain/format";
import type { BankAccount, GoalId } from "@/features/budget/domain/types";

const HEX64 = /^[0-9a-f]{64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONEY_MAX = 99999999999;

export const budgetTokenSchema = z
  .string({ error: "Token inválido." })
  .regex(HEX64, { error: "Token inválido." });

export const accessTokenSchema = z
  .string({ error: "Link inválido. Peça um novo link." })
  .regex(HEX64, { error: "Link inválido. Peça um novo link." });

export const inviteTokenSchema = z
  .string({ error: "Convite inválido. Peça um novo link." })
  .regex(HEX64, { error: "Convite inválido. Peça um novo link." });

export const emailSchema = z
  .string({ error: "Informe um e-mail válido." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Informe um e-mail válido." })
  .max(254, { error: "Informe um e-mail válido." })
  .regex(EMAIL, { error: "Informe um e-mail válido." });

export const nameSchema = z
  .string({ error: "Conte como você quer aparecer no orçamento." })
  .trim()
  .min(1, { error: "Conte como você quer aparecer no orçamento." })
  .max(50, { error: "Use no máximo 50 caracteres." });

export const revisionSchema = z
  .int({ error: "Versão inválida. Atualize a página." })
  .min(0, { error: "Versão inválida. Atualize a página." });

export const idSchema = z
  .string({ error: "Informe um identificador válido." })
  .trim()
  .min(1, { error: "Informe um identificador válido." })
  .max(100, { error: "Informe um identificador válido." });

export function textSchema(max: number) {
  return z
    .string({ error: "Confira os campos informados." })
    .trim()
    .min(1, { error: "Confira os campos informados." })
    .max(max, { error: "Confira os campos informados." });
}

export const monthSchema = z
  .string({ error: "Escolha um mês válido." })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Escolha um mês válido." });

export const dateSchema = z
  .string({ error: "Escolha uma data válida." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Escolha uma data válida." })
  .refine(
    (value) => {
      const date = new Date(`${value}T12:00:00`);
      return (
        !Number.isNaN(date.getTime()) &&
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` ===
          value &&
        value >= "1900-01-01"
      );
    },
    { error: "Escolha uma data válida." },
  );

export const goalIdSchema = z.enum(
  GOALS.map((goal) => goal.id) as [GoalId, ...GoalId[]],
  { error: "Meta inválida." },
);

export const centsSchema = z
  .int({ error: "Digite um valor válido, como 45,90." })
  .min(1, { error: "Digite um valor válido, como 45,90." })
  .max(MONEY_MAX, { error: "Digite um valor válido, como 45,90." });

export const balanceCentsSchema = z
  .int({ error: "Digite um saldo inicial válido, como 0,00 ou 1.250,00." })
  .min(0, { error: "Digite um saldo inicial válido, como 0,00 ou 1.250,00." })
  .max(MONEY_MAX, {
    error: "Digite um saldo inicial válido, como 0,00 ou 1.250,00.",
  });

export const amountInputSchema = z
  .string({ error: "Digite um valor válido, como 45,90." })
  .transform((value) => parseAmount(value))
  .pipe(centsSchema);

export const balanceInputSchema = z
  .string({
    error: "Digite um saldo inicial válido, como 0,00 ou 1.250,00.",
  })
  .transform((value) => parseBalance(value))
  .pipe(balanceCentsSchema);

export const tagSchema = z
  .string({ error: "Cada tag deve ter no máximo 24 caracteres." })
  .max(24, { error: "Cada tag deve ter no máximo 24 caracteres." });

export const tagsSchema = z
  .array(tagSchema, { error: "Use no máximo 8 tags." })
  .max(8, { error: "Use no máximo 8 tags." });

export const occurrencesSchema = z
  .int({ error: "Escolha entre 1 e 120 ocorrências." })
  .min(1, { error: "Escolha entre 1 e 120 ocorrências." })
  .max(120, { error: "Escolha entre 1 e 120 ocorrências." });

export const followingSchema = z.array(
  z.object(
    {
      id: idSchema,
      revision: revisionSchema,
    },
    { error: "Recorrência inválida." },
  ),
  { error: "Recorrência inválida." },
);

const optionalText = z
  .string({ error: "Confira os dados da transação." })
  .optional();

export const transactionSchema = z
  .looseObject({
    id: z
      .string({ error: "Confira os dados da transação." })
      .min(1, { error: "Confira os dados da transação." })
      .max(100, { error: "Confira os dados da transação." }),
    description: z
      .string({ error: "Dê um nome para esta transação." })
      .trim()
      .min(1, { error: "Dê um nome para esta transação." })
      .max(80, {
        error: "A descrição deve ter no máximo 80 caracteres.",
      }),
    amount: centsSchema,
    kind: z.enum(["expense", "income"], {
      error: "Tipo da transação inválido.",
    }),
    date: dateSchema,
    goal: goalIdSchema.nullable(),
    tags: tagsSchema,
    accountId: z
      .string({ error: "Escolha uma conta bancária." })
      .min(1, { error: "Escolha uma conta bancária." })
      .max(100, { error: "Escolha uma conta bancária." }),
    recurrenceId: optionalText,
    recurrenceIndex: z
      .int({ error: "Recorrência inválida." })
      .optional(),
    memberId: optionalText,
    revision: revisionSchema.optional(),
    createdBy: optionalText,
    updatedBy: optionalText,
    updatedAt: optionalText,
  })
  .refine((value) => !(value.kind === "expense" && value.goal === null), {
    error: "Escolha uma das seis metas para esta despesa.",
    path: ["goal"],
  })
  .refine((value) => !(value.kind === "income" && value.goal !== null), {
    error: "Receitas não podem ter meta.",
    path: ["goal"],
  });

export const bankAccountSchema = z.looseObject({
  id: z
    .string({ error: "Confira os dados da conta." })
    .min(1, { error: "Confira os dados da conta." })
    .max(100, { error: "Confira os dados da conta." }),
  name: z
    .string({ error: "Dê um nome para esta conta." })
    .trim()
    .min(1, { error: "Dê um nome para esta conta." })
    .max(50, { error: "O nome da conta deve ter no máximo 50 caracteres." }),
  openingBalance: balanceCentsSchema,
  revision: revisionSchema.optional(),
});

const percentageValueSchema = z
  .number({ error: "Informe um percentual entre 0 e 100." })
  .min(0, { error: "Informe um percentual entre 0 e 100." })
  .max(100, { error: "Informe um percentual entre 0 e 100." })
  .refine((value) => Number.isFinite(value), {
    error: "Informe um percentual entre 0 e 100.",
  })
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, {
    error: "Use no máximo duas casas decimais.",
  });

export const goalPercentagesSchema = z
  .looseObject({
    fixed: percentageValueSchema,
    pleasure: percentageValueSchema,
    comfort: percentageValueSchema,
    targets: percentageValueSchema,
    knowledge: percentageValueSchema,
    freedom: percentageValueSchema,
  } satisfies Record<GoalId, typeof percentageValueSchema>)
  .refine(
    (values) =>
      Math.round(
        GOALS.reduce((sum, { id }) => sum + values[id] * 100, 0),
      ) === 10000,
    { error: "Os percentuais devem somar 100%." },
  );

export function transactionFormSchema(accounts: BankAccount[]) {
  const accountError = accounts.length
    ? "Escolha uma conta bancária."
    : "Cadastre uma conta na aba Contas antes de lançar transações.";
  return z
    .object({
      amount: amountInputSchema,
      description: z
        .string({ error: "Dê um nome para esta transação." })
        .trim()
        .min(1, { error: "Dê um nome para esta transação." })
        .max(80, { error: "A descrição deve ter no máximo 80 caracteres." }),
      date: dateSchema,
      accountId: z
        .string({ error: accountError })
        .refine(
          (value) => accounts.some((account) => account.id === value),
          { error: accountError },
        ),
      goal: goalIdSchema.nullable(),
      kind: z.enum(["expense", "income"], {
        error: "Tipo da transação inválido.",
      }),
      occurrences: occurrencesSchema,
    })
    .refine((value) => !(value.kind === "expense" && value.goal === null), {
      error: "Escolha uma das seis metas para esta despesa.",
      path: ["goal"],
    })
    .refine((value) => !(value.kind === "income" && value.goal !== null), {
      error: "Receitas não podem ter meta.",
      path: ["goal"],
    });
}

export const accountFormSchema = z.object({
  name: z
    .string({ error: "Dê um nome para esta conta." })
    .trim()
    .min(1, { error: "Dê um nome para esta conta." })
    .max(50, { error: "O nome da conta deve ter no máximo 50 caracteres." }),
  openingBalance: balanceInputSchema,
});

export const emailFormSchema = z.object({ email: emailSchema });

export const nameFormSchema = z.object({ name: nameSchema });

export const inviteFormSchema = z.object({ invite: inviteTokenSchema });

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Requisição inválida.";
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

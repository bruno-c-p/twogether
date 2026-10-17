import Big from "big.js";
import { z } from "zod";
import { localDate, parseAmount } from "@/features/budget/domain/format";
import { sum } from "@/lib/decimal";

const MONEY_MAX = 99999999999;

export const revisionSchema = z
  .int({ error: "Versão inválida. Atualize a página." })
  .min(0, { error: "Versão inválida. Atualize a página." });

export const idSchema = z
  .string({ error: "Informe um identificador válido." })
  .trim()
  .min(1, { error: "Informe um identificador válido." })
  .max(100, { error: "Informe um identificador válido." });

export const monthSchema = z
  .string({ error: "Escolha um mês válido." })
  .regex(/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/, {
    error: "Escolha um mês entre 1900 e 9999.",
  });

// A real calendar day: "2026-02-30" does not survive the round trip.
export const dateSchema = z
  .string({ error: "Escolha uma data válida." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Escolha uma data válida." })
  .refine(
    (value) => {
      const date = new Date(`${value}T12:00:00`);

      return (
        !Number.isNaN(date.getTime()) &&
        localDate(date) === value &&
        value >= "1900-01-01"
      );
    },
    { error: "Escolha uma data válida." },
  );

// Order matches GOALS in constants.ts.
export const GOAL_IDS = [
  "fixed",
  "pleasure",
  "comfort",
  "targets",
  "knowledge",
  "freedom",
] as const;

export const goalIdSchema = z.enum(GOAL_IDS, { error: "Meta inválida." });

export const transactionKindSchema = z.enum(["expense", "income"], {
  error: "Tipo da transação inválido.",
});

export const viewSchema = z.enum(["overview", "transactions", "goals"], {
  error: "Visão inválida.",
});

export const centsSchema = z
  .int({ error: "Digite um valor válido, como 45,90." })
  .min(1, { error: "Digite um valor válido, como 45,90." })
  .max(MONEY_MAX, { error: "Digite um valor válido, como 45,90." })
  .brand<"Cents">();

const amountInputSchema = z
  .string({ error: "Digite um valor válido, como 45,90." })
  .transform((value) => parseAmount(value))
  .pipe(centsSchema);

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

export const descriptionSchema = z
  .string({ error: "Dê um nome para esta transação." })
  .trim()
  .min(1, { error: "Dê um nome para esta transação." })
  .max(80, { error: "A descrição deve ter no máximo 80 caracteres." });

// Expenses need one of the six goals; income never has one.
function withGoalRules<
  Schema extends z.ZodType<{
    kind: z.infer<typeof transactionKindSchema>;
    goal: string | null;
  }>,
>(schema: Schema) {
  return schema
    .refine((value) => !(value.kind === "expense" && value.goal === null), {
      error: "Escolha uma das seis metas para esta despesa.",
      path: ["goal"],
    })
    .refine((value) => !(value.kind === "income" && value.goal !== null), {
      error: "Receitas não podem ter meta.",
      path: ["goal"],
    });
}

// One cent cannot be halved between two people.
const SPLIT_MINIMUM_ERROR = "Use um valor de pelo menos R$ 0,02 para dividir.";

function splitTooSmall(value: { amount: number; split?: boolean | object }) {
  return Boolean(value.split) && value.amount < 2;
}

const optionalText = z
  .string({ error: "Confira os dados da transação." })
  .optional();

const splitObjectSchema = z.object(
  {
    paidAt: optionalText,
    paidBy: optionalText,
    entryIds: z
      .array(idSchema, { error: "Divisão inválida." })
      .length(2, { error: "Divisão inválida." })
      .optional(),
  },
  { error: "Divisão inválida." },
);

export const transactionObjectSchema = z.object({
  id: z
    .string({ error: "Confira os dados da transação." })
    .min(1, { error: "Confira os dados da transação." })
    .max(100, { error: "Confira os dados da transação." }),
  description: descriptionSchema,
  amount: centsSchema,
  kind: transactionKindSchema,
  date: dateSchema,
  goal: goalIdSchema.nullable(),
  recurrenceId: optionalText,
  recurrenceIndex: z.int({ error: "Recorrência inválida." }).optional(),
  memberId: optionalText,
  revision: revisionSchema.optional(),
  createdBy: optionalText,
  updatedBy: optionalText,
  updatedAt: optionalText,
  split: splitObjectSchema.optional(),
  settlementOf: optionalText,
});

export const transactionSchema: z.ZodType<
  z.output<typeof transactionObjectSchema>,
  z.input<typeof transactionObjectSchema>
> = withGoalRules(
  transactionObjectSchema
    .extend({ split: splitObjectSchema.loose().optional() })
    .loose(),
)
  .refine((value) => !(value.split && value.kind !== "expense"), {
    error: "Só despesas podem ser divididas.",
    path: ["split"],
  })
  .refine((value) => !splitTooSmall(value), {
    error: SPLIT_MINIMUM_ERROR,
    path: ["split"],
  });

const percentageValueSchema = z
  .number({ error: "Informe um percentual entre 0 e 100." })
  .min(0, { error: "Informe um percentual entre 0 e 100." })
  .max(100, { error: "Informe um percentual entre 0 e 100." })
  .refine((value) => new Big(value).times(100).mod(1).eq(0), {
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
  } satisfies Record<
    z.infer<typeof goalIdSchema>,
    typeof percentageValueSchema
  >)
  .refine((values) => sum(GOAL_IDS.map((id) => values[id])) === 100, {
    error: "Os percentuais devem somar 100%.",
  });

export const transactionFormSchema = withGoalRules(
  z
    .object({
      amount: amountInputSchema,
      description: descriptionSchema,
      date: dateSchema,
      goal: goalIdSchema.nullable(),
      kind: transactionKindSchema,
      occurrences: occurrencesSchema,
      split: z.boolean(),
    })
    .refine((value) => !splitTooSmall(value), {
      error: SPLIT_MINIMUM_ERROR,
      path: ["amount"],
    }),
);

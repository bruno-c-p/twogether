import Big from "big.js";
import { z } from "zod/mini";
import { localDate, parseAmount } from "@/features/budget/domain/format";
import { sum } from "@/lib/decimal";

const MONEY_MAX = 99999999999;

export const revisionSchema = z
  .int({ error: "Versão inválida. Atualize a página." })
  .check(z.minimum(0, { error: "Versão inválida. Atualize a página." }));

export const idSchema = z
  .string({ error: "Informe um identificador válido." })
  .check(
    z.trim(),
    z.minLength(1, { error: "Informe um identificador válido." }),
    z.maxLength(100, { error: "Informe um identificador válido." }),
  );

export const monthSchema = z.string({ error: "Escolha um mês válido." }).check(
  z.regex(/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/, {
    error: "Escolha um mês entre 1900 e 9999.",
  }),
);

// A real calendar day: "2026-02-30" does not survive the round trip.
export const dateSchema = z.string({ error: "Escolha uma data válida." }).check(
  z.regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Escolha uma data válida." }),
  z.refine(
    (value) => {
      const date = new Date(`${value}T12:00:00`);

      return (
        !Number.isNaN(date.getTime()) &&
        localDate(date) === value &&
        value >= "1900-01-01"
      );
    },
    { error: "Escolha uma data válida." },
  ),
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

export const transactionKindSchema = z.enum(["expense", "income", "transfer"], {
  error: "Tipo da transação inválido.",
});

// The goal a kind starts with; only expenses let the person pick one.
export const KIND_GOAL = {
  expense: null,
  income: null,
  transfer: "freedom",
} as const satisfies Record<
  z.infer<typeof transactionKindSchema>,
  (typeof GOAL_IDS)[number] | null
>;

export const viewSchema = z.enum(["overview", "transactions", "goals"], {
  error: "Visão inválida.",
});

export const centsSchema = z
  .int({ error: "Digite um valor válido, como 45,90." })
  .check(
    z.minimum(1, { error: "Digite um valor válido, como 45,90." }),
    z.maximum(MONEY_MAX, { error: "Digite um valor válido, como 45,90." }),
  )
  .brand<"Cents">();

const amountInputSchema = z.pipe(
  z.pipe(
    z.string({ error: "Digite um valor válido, como 45,90." }),
    z.transform((value: string) => parseAmount(value)),
  ),
  centsSchema,
);

export const occurrencesSchema = z
  .int({ error: "Escolha entre 1 e 120 ocorrências." })
  .check(
    z.minimum(1, { error: "Escolha entre 1 e 120 ocorrências." }),
    z.maximum(120, { error: "Escolha entre 1 e 120 ocorrências." }),
  );

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
  .check(
    z.trim(),
    z.minLength(1, { error: "Dê um nome para esta transação." }),
    z.maxLength(80, { error: "A descrição deve ter no máximo 80 caracteres." }),
  );

type GoalRuleFields = {
  kind: z.infer<typeof transactionKindSchema>;
  goal: string | null;
  split?: boolean | object;
  settlementOf?: string;
};

// Freedom is a transfer's goal. An expense keeps it only when it is a split
// saved before transfers existed, or the partner's share of one, written when
// it is settled.
export function isLegacyFreedomExpense(value: GoalRuleFields) {
  return (
    value.kind === "expense" &&
    value.goal === "freedom" &&
    Boolean(value.split || value.settlementOf)
  );
}

export const FREEDOM_EXPENSE_ERROR =
  "Use Transferência para Liberdade financeira.";

// Expenses need a goal, income never has one, and transfers always fill
// freedom.
function withGoalRules<Schema extends z.ZodMiniType<GoalRuleFields>>(
  schema: Schema,
) {
  return schema.check(
    z.refine((value) => !(value.kind === "expense" && value.goal === null), {
      error: "Escolha uma meta para esta despesa.",
      path: ["goal"],
    }),
    z.refine(
      (value) =>
        value.kind !== "expense" ||
        value.goal !== "freedom" ||
        isLegacyFreedomExpense(value),
      { error: FREEDOM_EXPENSE_ERROR, path: ["goal"] },
    ),
    z.refine((value) => !(value.kind === "income" && value.goal !== null), {
      error: "Receitas não podem ter meta.",
      path: ["goal"],
    }),
    z.refine(
      (value) => !(value.kind === "transfer" && value.goal !== "freedom"),
      {
        error: "Transferências vão para Liberdade financeira.",
        path: ["goal"],
      },
    ),
  );
}

// One cent cannot be halved between two people.
const SPLIT_MINIMUM_ERROR = "Use um valor de pelo menos R$ 0,02 para dividir.";

function splitTooSmall(value: { amount: number; split?: boolean | object }) {
  return Boolean(value.split) && value.amount < 2;
}

const optionalText = z.optional(
  z.string({ error: "Confira os dados da transação." }),
);

const splitObjectSchema = z.object(
  {
    paidAt: optionalText,
    paidBy: optionalText,
    entryIds: z.optional(
      z
        .array(idSchema, { error: "Divisão inválida." })
        .check(z.length(2, { error: "Divisão inválida." })),
    ),
  },
  { error: "Divisão inválida." },
);

export const transactionObjectSchema = z.object({
  id: z
    .string({ error: "Confira os dados da transação." })
    .check(
      z.minLength(1, { error: "Confira os dados da transação." }),
      z.maxLength(100, { error: "Confira os dados da transação." }),
    ),
  description: descriptionSchema,
  amount: centsSchema,
  kind: transactionKindSchema,
  date: dateSchema,
  goal: z.nullable(goalIdSchema),
  recurrenceId: optionalText,
  recurrenceIndex: z.optional(z.int({ error: "Recorrência inválida." })),
  memberId: optionalText,
  revision: z.optional(revisionSchema),
  createdBy: optionalText,
  updatedBy: optionalText,
  updatedAt: optionalText,
  split: z.optional(splitObjectSchema),
  settlementOf: optionalText,
});

export const transactionSchema: z.ZodMiniType<
  z.output<typeof transactionObjectSchema>,
  z.input<typeof transactionObjectSchema>
> = withGoalRules(
  z.catchall(
    z.extend(transactionObjectSchema, {
      split: z.optional(z.catchall(splitObjectSchema, z.unknown())),
    }),
    z.unknown(),
  ),
).check(
  z.refine((value) => !(value.split && value.kind !== "expense"), {
    error: "Só despesas podem ser divididas.",
    path: ["split"],
  }),
  z.refine((value) => !splitTooSmall(value), {
    error: SPLIT_MINIMUM_ERROR,
    path: ["split"],
  }),
);

const percentageValueSchema = z
  .number({ error: "Informe um percentual entre 0 e 100." })
  .check(
    z.minimum(0, { error: "Informe um percentual entre 0 e 100." }),
    z.maximum(100, { error: "Informe um percentual entre 0 e 100." }),
    z.refine((value) => new Big(value).times(100).mod(1).eq(0), {
      error: "Use no máximo duas casas decimais.",
    }),
  );

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
  .check(
    z.refine((values) => sum(GOAL_IDS.map((id) => values[id])) === 100, {
      error: "Os percentuais devem somar 100%.",
    }),
  );

export const transactionFormSchema = withGoalRules(
  z
    .object({
      amount: amountInputSchema,
      description: descriptionSchema,
      date: dateSchema,
      goal: z.nullable(goalIdSchema),
      kind: transactionKindSchema,
      occurrences: occurrencesSchema,
      split: z.boolean(),
    })
    .check(
      z.refine((value) => !splitTooSmall(value), {
        error: SPLIT_MINIMUM_ERROR,
        path: ["amount"],
      }),
    ),
);

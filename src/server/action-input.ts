import { z } from "zod";
import { firstIssueMessage } from "@/features/budget/domain/schemas";

function invalid(message = "Requisição inválida."): never {
  throw new Error(message);
}

export function inputSchema<Fields extends Record<string, z.ZodType>>(
  fields: Fields,
) {
  return z.object(fields, { error: "Requisição inválida." });
}

export function actionInput<Input>(schema: z.ZodType<Input>) {
  return (input: Input): Input => {
    const result = schema.safeParse(input);

    if (!result.success) invalid(firstIssueMessage(result.error));

    return result.data;
  };
}

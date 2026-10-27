import { z } from "zod/mini";
import { firstIssueMessage } from "@/lib/zod-errors";

function invalid(message = "Requisição inválida."): never {
  throw new Error(message);
}

export function inputSchema<Fields extends Record<string, z.core.$ZodType>>(
  fields: Fields,
) {
  return z.object(fields, { error: "Requisição inválida." });
}

// `fail` lets callers outside server functions raise their own error type.
export function parseInput<Output, Input = Output>(
  schema: z.core.$ZodType<Output, Input>,
  input: Input,
  fail: (message: string) => never = invalid,
): Output {
  const result = z.safeParse(schema, input);

  if (!result.success) fail(firstIssueMessage(result.error));

  return result.data;
}

export function actionInput<Input>(schema: z.core.$ZodType<Input>) {
  return (input: Input): Input => parseInput(schema, input);
}

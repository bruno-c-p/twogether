import { z } from "zod";
import { firstIssueMessage } from "@/features/budget/domain/schemas";

export function invalid(message = "Requisição inválida."): never {
  throw new Error(message);
}

export function inputSchema<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.object(shape, { error: "Requisição inválida." });
}

export function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) invalid(firstIssueMessage(result.error));
  return result.data;
}

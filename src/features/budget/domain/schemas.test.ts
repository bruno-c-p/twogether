import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  fieldErrors,
  firstIssueMessage,
} from "@/features/budget/domain/schemas";

const form = z.object({
  name: z
    .string()
    .min(2, { error: "Nome curto." })
    .max(3, { error: "Nome longo." }),
  amount: z.number({ error: "Valor inválido." }),
});

describe("form error helpers", () => {
  test("fieldErrors keeps the first message per field", () => {
    const parsed = form.safeParse({ name: "", amount: "x" });

    expect(parsed.success).toBe(false);

    if (!parsed.success)
      expect(fieldErrors(parsed.error)).toEqual({
        name: "Nome curto.",
        amount: "Valor inválido.",
      });
  });

  test("fieldErrors skips issues that are not tied to a field", () => {
    const parsed = z.string({ error: "Texto." }).safeParse(1);

    if (!parsed.success) expect(fieldErrors(parsed.error)).toEqual({});
  });

  test("firstIssueMessage falls back to a generic message", () => {
    expect(firstIssueMessage(new z.ZodError([]))).toBe("Requisição inválida.");
  });
});

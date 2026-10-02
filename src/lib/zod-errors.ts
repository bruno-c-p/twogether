import type { z } from "zod";

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Requisição inválida.";
}

export function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");

    if (field && !errors[field]) errors[field] = issue.message;
  }

  return errors;
}

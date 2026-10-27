import { en } from "zod/locales";
import { z } from "zod/mini";

// Classic zod installs its English messages on import; zod/mini does not.
z.config(en());

export function firstIssueMessage(error: z.core.$ZodError): string {
  return error.issues[0]?.message ?? "Requisição inválida.";
}

export function fieldErrors(error: z.core.$ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");

    if (field && !errors[field]) errors[field] = issue.message;
  }

  return errors;
}

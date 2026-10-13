import { z } from "zod";
import { firstIssueMessage } from "@/lib/zod-errors";

const CLERK_MESSAGE =
  "VITE_CLERK_PUBLISHABLE_KEY variable required by Clerk is missing or un-configured.";

// Blank .env entries mean "not configured".
function emptyAsUndefined<Value>(value: Value) {
  return value === "" ? undefined : value;
}

const clientEnvSchema = z.object({
  VITE_CLERK_PUBLISHABLE_KEY: z.preprocess(
    emptyAsUndefined,
    z.string({ error: CLERK_MESSAGE }).min(1, { error: CLERK_MESSAGE }),
  ),
});

export function parseClientEnv(values: Record<string, string | undefined>) {
  const result = clientEnvSchema.safeParse(values);

  if (!result.success) throw new Error(firstIssueMessage(result.error));

  return result.data;
}

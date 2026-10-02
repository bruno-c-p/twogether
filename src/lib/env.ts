import { z } from "zod";
import { firstIssueMessage } from "@/lib/zod-errors";

const CLERK_MESSAGE =
  "VITE_CLERK_PUBLISHABLE_KEY variable required by Clerk is missing or un-configured.";

const POSTHOG_TOKEN_MESSAGE =
  "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured";

const POSTHOG_HOST_MESSAGE =
  "VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured";

const INVALID_MESSAGE = "must be a non-empty string when configured.";

// Blank .env entries mean "not configured".
function emptyAsUndefined<Value>(value: Value) {
  return value === "" ? undefined : value;
}

const optionalValue = (key: string) =>
  z.preprocess(
    emptyAsUndefined,
    z
      .string({ error: `${key} ${INVALID_MESSAGE}` })
      .min(1, { error: `${key} ${INVALID_MESSAGE}` })
      .optional(),
  );

const clientEnvSchema = z.object({
  VITE_CLERK_PUBLISHABLE_KEY: z.preprocess(
    emptyAsUndefined,
    z.string({ error: CLERK_MESSAGE }).min(1, { error: CLERK_MESSAGE }),
  ),
  VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: optionalValue(
    "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN",
  ),
  VITE_PUBLIC_POSTHOG_HOST: optionalValue("VITE_PUBLIC_POSTHOG_HOST"),
});

export function parseClientEnv(
  values: Record<string, string | undefined>,
  options: { dev?: boolean } = {},
) {
  const schema = options.dev
    ? clientEnvSchema.superRefine((env, ctx) => {
        if (!env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN)
          ctx.addIssue({
            code: "custom",
            message: POSTHOG_TOKEN_MESSAGE,
            path: ["VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"],
          });

        if (!env.VITE_PUBLIC_POSTHOG_HOST)
          ctx.addIssue({
            code: "custom",
            message: POSTHOG_HOST_MESSAGE,
            path: ["VITE_PUBLIC_POSTHOG_HOST"],
          });
      })
    : clientEnvSchema;

  const result = schema.safeParse(values);

  if (!result.success) throw new Error(firstIssueMessage(result.error));

  return result.data;
}

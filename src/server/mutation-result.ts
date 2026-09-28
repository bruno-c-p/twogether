import { z } from "zod";

const mutationFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(["conflict", "invalid", "full", "expired", "limited"]),
  message: z.string(),
});

export type MutationErrorCode = z.infer<typeof mutationFailureSchema>["code"];

export type MutationFailure = z.infer<typeof mutationFailureSchema>;

export type MutationSuccess<T extends object = Record<never, never>> = T & {
  ok: true;
};

export type MutationResult<T extends object = Record<never, never>> =
  MutationSuccess<T> | MutationFailure;

export function isMutationFailure(value: unknown): value is MutationFailure {
  return mutationFailureSchema.safeParse(value).success;
}

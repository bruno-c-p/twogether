export type MutationErrorCode =
  "conflict" | "invalid" | "full" | "expired" | "limited";

export type MutationFailure = {
  ok: false;
  code: MutationErrorCode;
  message: string;
};

export type MutationSuccess<T extends object = Record<string, never>> = T & {
  ok: true;
};

export type MutationResult<T extends object = Record<string, never>> =
  MutationSuccess<T> | MutationFailure;

export function isMutationFailure(value: unknown): value is MutationFailure {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { message?: unknown }).message === "string"
  );
}
